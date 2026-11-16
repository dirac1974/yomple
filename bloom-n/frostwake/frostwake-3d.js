/**
 * Frostwake: Flux Terra-Rigs — 60fps Three.js Deformable-Snow, Active Opposition,
 * 2-Player Live Co-Op & 3D Spatial Encounter Engine
 * Built for phones, tablets, desktops, and headless Node tests with zero external CDN assets.
 */

import * as THREE from "../vendor/three.module.min.js";
import { FrostwakeAudio } from "./audio.js";
import { FrostwakeOpposition3D, HARPOON_GRAPPLE_RANGE } from "./opposition-3d.js";
import {
  buildEncounter3DGroup,
  updateEncounterDialPreview,
  triggerTwinBeamEncounterFX,
  applyEncounterCommitFX,
  updateEncounterAnimations,
  buildQuadrantWhaleBeacons,
  updateQuadrantWhaleBeacons,
} from "./encounters-3d.js";
import { GhostRigController } from "./ghost-rig.js";
import { FrostwakeCoop3D } from "./coop-3d.js";
import {
  buildCelestialSkyDome,
  buildTempleSanctuaryFrame,
  stepTempleSanctuaryFrame,
  SlipstreamBoostVFXController,
  HorizonWonderAndRelicSystem,
  createSoftGlowTexture,
} from "../core/vfx-3d.js";
import {
  computeSimulationTimeScale,
  resolveActiveBiome,
  createFieldExpeditionState,
  stepFieldExpedition,
  exportRobloxSimSnapshot,
} from "../core/world-sim.js";

export const VALLEY_SIZE = 184;
export const VALLEY_HALF = VALLEY_SIZE / 2;
export const GRID_SEGMENTS = 128;
export const MAX_VALLEY_RADIUS = 68;
const MAX_SNOW_LILIES = 240;
const MAX_WOKEN_FOXES = 12;

const FROSTWAKE_CHASSIS_SPECS = [
  {
    id: "terra_dozer",
    plowWidth: 3.1,
    topSpeed: 17.5,
    turnRate: 2.5,
    primaryHex: 0xf4a62a,
    secondaryHex: 0x24344d,
    glowHex: 0x45f0df,
  },
  {
    id: "aurora_sled",
    plowWidth: 2.9,
    topSpeed: 19.2,
    turnRate: 3.0,
    primaryHex: 0x5ce1e6,
    secondaryHex: 0x1c2b4b,
    glowHex: 0xf7d06b,
  },
];

const GUARDIAN_WORLD_COLORS = {
  W0: 0x6be6d3,
  W1: 0x4ad8ff,
  W2: 0x7ee081,
  W3: 0xf7b955,
  W4: 0x38d9c0,
  W5: 0xf5c451,
  W6: 0xff9b71,
  W7: 0x66e3ff,
};

function finiteOr(val, fallback = 0) {
  if (typeof val === "number") return Number.isFinite(val) ? val : fallback;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return fallback;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

function clampFinite(val, min, max, fallback = 0) {
  const n = finiteOr(val, NaN);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function wrapAngleDiff(target, current) {
  const a0 = Math.atan2(Math.sin(finiteOr(current, 0)), Math.cos(finiteOr(current, 0)));
  const b0 = Math.atan2(Math.sin(finiteOr(target, 0)), Math.cos(finiteOr(target, 0)));
  const rawDiff = b0 - a0;
  return Math.atan2(Math.sin(rawDiff), Math.cos(rawDiff));
}

function round3(n) {
  return Math.round(finiteOr(n, 0) * 1000) / 1000;
}

export class FrostwakeWorld3D {
  constructor(opts = {}) {
    const safeOpts = opts && typeof opts === "object" ? opts : {};
    const {
      canvas = null,
      audio = null,
      onWorldActivity = null,
      onSnowCleared = null,
      onApproachGate = null,
      onLeaveGate = null,
      onMysteryFound = null,
      onCreatureHatched = null,
      onGaragePadEntered = null,
      onOppositionEvent = null,
      onSharedCoinGrabbed = null,
    } = safeOpts;

    this.canvas = canvas;
    this.audio = audio && typeof audio === "object" ? audio : new FrostwakeAudio();
    this._onWorldActivityFn = typeof onWorldActivity === "function" ? onWorldActivity : null;
    this._onSnowClearedFn = typeof onSnowCleared === "function" ? onSnowCleared : null;
    this.onApproachGate = typeof onApproachGate === "function" ? onApproachGate : () => {};
    this.onLeaveGate = typeof onLeaveGate === "function" ? onLeaveGate : () => {};
    this.onMysteryFound = typeof onMysteryFound === "function" ? onMysteryFound : () => {};
    this.onCreatureHatched = typeof onCreatureHatched === "function" ? onCreatureHatched : () => {};
    this.onGaragePadEntered =
      typeof onGaragePadEntered === "function" ? onGaragePadEntered : () => {};
    this.onOppositionEvent =
      typeof onOppositionEvent === "function" ? onOppositionEvent : null;
    this.onSharedCoinGrabbed =
      typeof onSharedCoinGrabbed === "function" ? onSharedCoinGrabbed : () => {};

    // Legacy snow callback alias preserved
    this.onSnowCleared = (m2, bonusFlux) =>
      this._emitWorldActivity(m2, bonusFlux, "snowClearedM2");

    this.running = false;
    this.webglAvailable = false;
    this.renderer = null;
    this._rafId = null;
    this.clock = new THREE.Clock();
    this.simElapsed = 0;
    this.elapsed = 0;
    this._baseCameraFov = 52;
    this.encounterDockOpen = false;
    this._boundProgressRef = null;

    const rawDpr = typeof window !== "undefined" ? window.devicePixelRatio : 1;
    this.maxDpr = clampFinite(rawDpr, 0.85, 2, 1);
    this.currentDpr = this.maxDpr;
    this._dprFrames = 0;
    this._dprSec = 0;
    this._dprCooldown = 0;

    this.rigState = {
      x: 0,
      y: 0,
      z: 22,
      vx: 0,
      vz: 0,
      pitch: 0,
      roll: 0,
      lateralSlip: 0,
      distTraveled: 0,
      heading: 0, // 0 rad faces -Z north into the valley
      speed: 0,
      steerInput: 0,
      throttleInput: 0,
      boosting: false,
      chassisId: "terra_dozer",
      upgrades: [],
      observatoryTier: 1,
      inSurge: false,
      inPermafrost: false,
      crossRealm: {},
      borrowedMeta: { active: false, owner: null, displayName: null },
    };

    this.crossRealmState = {};
    this.borrowedToyState = { active: false, owner: null, displayName: null };

    this.autopilotTarget = null;
    this.activeGateSlot = null;
    this.dialPreviewValue = 0;
    this.moonDwellSec = 0;
    this.carvedCountAccum = 0;

    this.garagePadArmed = true;
    this.garagePadCooldown = 0;
    this.guardianAwakeTimer = 0;
    this.guardianAwakeWorldId = null;
    this.guardianAwakeningCount = 0;

    this.rigAnim = null;
    this.laserBeams = [];
    this.wokenFoxes = [];
    this.gateSlots = [];
    this.sledPlasmaCones = [];
    this.rigThrusterCones = [];
    this.whaleTimer = 0;
    this._quadrantWhaleTriggered = false;
    this.lastGhostWaveResult = null;

    this.bulletTimeRequested = false;
    this._lastSimDt = 1 / 60;
    this.simTimeState = computeSimulationTimeScale({
      dt: 1 / 60,
      encounterDockOpen: false,
      activeGateSlot: false,
      bulletTimeRequested: false,
      realmId: "frostwake",
    });
    this.fieldExpedition = createFieldExpeditionState("frostwake", 0);
    this._calderaHopTimer = 0;
    this.calderaGeyserVents = [];
    this.calderaSteamRings = [];
    this.singingCrystalChimes = [];
    this.causewayPylons = [];
    this.expeditionBeacons = [];
    this._expeditionBurstTimer = 0;
    this.clockworkCrest = null;
    this.clockworkCrestOuter = null;
    this.clockworkCrestInner = null;

    this._tmpMat4 = new THREE.Matrix4();
    this._tmpPos = new THREE.Vector3();
    this._tmpQuat = new THREE.Quaternion();
    this._tmpScale = new THREE.Vector3();
    this._tmpEuler = new THREE.Euler();
    this._camTargetVec = new THREE.Vector3();

    this._initScene();
  }

  _emitWorldActivity(amount, bonusFlux, metricKey = "snowClearedM2") {
    if (this._onWorldActivityFn) {
      this._onWorldActivityFn(amount, bonusFlux, metricKey);
    } else if (this._onSnowClearedFn && (metricKey === "snowClearedM2" || bonusFlux > 0)) {
      this._onSnowClearedFn(metricKey === "snowClearedM2" ? amount : 0, bonusFlux);
    }
  }

  _emitOppositionReward({
    kind,
    shardsEarned = 0,
    message = "",
    metricKey = null,
    metricDelta = 1,
  }) {
    if (this.onOppositionEvent) {
      this.onOppositionEvent({ kind, shardsEarned, message });
      if (metricKey && this._onWorldActivityFn) {
        this._onWorldActivityFn(metricDelta, 0, metricKey);
      }
    } else {
      this._emitWorldActivity(
        metricKey === "snowClearedM2" ? metricDelta : 0,
        shardsEarned,
        metricKey || "rimeCreepsCleared"
      );
    }
  }

  _baseHeight(x, z) {
    const sx = clampFinite(x, -VALLEY_SIZE, VALLEY_SIZE, 0);
    const sz = clampFinite(z, -VALLEY_SIZE, VALLEY_SIZE, 0);
    const r = Math.hypot(sx, sz);
    const centerFlat = Math.min(1, Math.max(0, (r - 10) / 18));
    const bowl = Math.pow(Math.max(0, r - 56) / 26, 2) * 3.4;
    const waves =
      (Math.sin(sx * 0.055) * Math.cos(sz * 0.055) * 1.1 + Math.sin(sz * 0.03) * 0.55) *
      centerFlat;
    const dGarageSq = (sx + 24) * (sx + 24) + (sz - 16) * (sz - 16);
    const garageBlend = 1 - 0.65 * Math.exp(-dGarageSq / 38);
    return (waves + bowl) * garageBlend;
  }

  _buildToonRamp() {
    const stops = new Uint8Array([
      42, 68, 98, 255,
      98, 145, 188, 255,
      180, 222, 245, 255,
      250, 253, 255, 255,
    ]);
    const tex = new THREE.DataTexture(stops, 4, 1, THREE.RGBAFormat);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    tex.needsUpdate = true;
    return tex;
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c2136);
    this.scene.fog = new THREE.FogExp2(0x102b44, 0.0056);

    this.camera = new THREE.PerspectiveCamera(this._baseCameraFov, 16 / 9, 0.4, 380);
    this.camera.position.set(0, 11, 36);

    this.renderer = null;
    this.webglAvailable = false;
    if (this.canvas && typeof this.canvas.getContext === "function") {
      try {
        this.renderer = new THREE.WebGLRenderer({
          canvas: this.canvas,
          antialias: true,
          powerPreference: "high-performance",
        });
        this.renderer.setPixelRatio(this.currentDpr);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.08;
        this.webglAvailable = true;
      } catch (_) {
        this.renderer = null;
        this.webglAvailable = false;
      }
    }

    const hemi = new THREE.HemisphereLight(0xbbeeff, 0x1b3b56, 1.25);
    const sun = new THREE.DirectionalLight(0xfff1d0, 1.55);
    sun.position.set(38, 62, 34);
    const auroraFill = new THREE.DirectionalLight(0x3bf0c5, 0.55);
    auroraFill.position.set(-40, 35, -56);
    this.scene.add(hemi, sun, auroraFill);

    this.toonRamp = this._buildToonRamp();
    this._buildAuroraSky();
    this._buildGlacialMountainRing();
    this._buildDeformableSnow();
    this._buildSnowLilyPool();
    this._buildMoonSanctuaryAndObservatory();
    this._buildFrostGuardian();
    this._buildLiftGaragePad();
    this._buildOuterFrontierBiomes();
    this._buildExpeditionBeacons();
    this._buildAlpinePines();
    this._buildRimIceCrystalClusters();
    this._buildSnowfallParticles();
    this._buildSprayAndShardPools();
    this._buildSkyWhale();
    this.quadrantBeacons = buildQuadrantWhaleBeacons(this.scene, (x, z) => this._baseHeight(x, z));

    this.slipstreamVfx = new SlipstreamBoostVFXController({
      scene: this.scene,
      theme: "frostwake",
    });
    this.horizonWonder = new HorizonWonderAndRelicSystem({
      scene: this.scene,
      theme: "frostwake",
      archPosition: { x: 0, y: this._baseHeight(0, -48) + 8.5, z: -48 },
    });

    this.opposition = new FrostwakeOpposition3D({
      scene: this.scene,
      baseHeightFn: (x, z) => this._baseHeight(x, z),
      createFoxMeshFn: () => this._createSpiritFoxMesh(),
      tintSnowDiscFn: (x, z, r, mode) => this._tintSnowDisc(x, z, r, mode),
      spawnCrystalBurstFn: (x, y, z, n) => this._spawnCrystalBurst(x, y, z, n),
      audio: this.audio,
      emitRewardFn: (payload) => this._emitOppositionReward(payload),
    });

    this.ghostController = new GhostRigController(this.scene, (x, z) => this._baseHeight(x, z));

    this.coop = new FrostwakeCoop3D({
      scene: this.scene,
      baseHeightFn: (x, z) => this._baseHeight(x, z),
      createFoxMeshFn: () => this._createSpiritFoxMesh(),
      spawnCrystalBurstFn: (x, y, z, n) => this._spawnCrystalBurst(x, y, z, n),
      audio: this.audio,
      onSharedCoinGrabbed: (coinId) => this.onSharedCoinGrabbed(coinId),
    });
    this.remotePartners = this.coop.remotePartners;
    this.sharedCoins = this.coop.sharedCoins;

    this.rebuildRig(this.rigState.chassisId, this.rigState.upgrades);

    this.resize();
    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      this._onResize = () => this.resize();
      window.addEventListener("resize", this._onResize);
    }
  }

  resize() {
    if (!this.camera) return;
    const winW = typeof window !== "undefined" && window.innerWidth ? window.innerWidth : 1280;
    const winH = typeof window !== "undefined" && window.innerHeight ? window.innerHeight : 720;
    const rect =
      this.canvas && this.canvas.parentElement && typeof this.canvas.parentElement.getBoundingClientRect === "function"
        ? this.canvas.parentElement.getBoundingClientRect()
        : { width: winW, height: winH };
    const w = Math.max(300, rect.width || winW);
    const h = Math.max(260, rect.height || winH);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.renderer && this.webglAvailable) {
      this.renderer.setSize(w, h, false);
    }
  }

  _recordFrameSample(rawDtSec) {
    if (!(rawDtSec > 0 && rawDtSec < 0.25)) return;
    this._dprFrames += 1;
    this._dprSec += rawDtSec;
    if (this._dprCooldown > 0) {
      this._dprCooldown = Math.max(0, this._dprCooldown - rawDtSec);
    }
    if (this._dprFrames < 45) return;

    const avgFps = this._dprFrames / this._dprSec;
    this._dprFrames = 0;
    this._dprSec = 0;

    if (avgFps < 50 && this.currentDpr > 0.85) {
      this.currentDpr = Math.max(0.85, Math.round((this.currentDpr - 0.25) * 100) / 100);
      if (this.renderer && this.webglAvailable) {
        this.renderer.setPixelRatio(this.currentDpr);
      }
      this._dprCooldown = 2.5;
    } else if (avgFps > 58.5 && this.currentDpr < this.maxDpr && this._dprCooldown <= 0) {
      this.currentDpr = Math.min(this.maxDpr, Math.round((this.currentDpr + 0.15) * 100) / 100);
      if (this.renderer && this.webglAvailable) {
        this.renderer.setPixelRatio(this.currentDpr);
      }
      this._dprCooldown = 4.0;
    }
  }

  _buildAuroraSky() {
    this.celestialSkyDome = buildCelestialSkyDome({ theme: "frostwake", radius: 228 });
    this.scene.add(this.celestialSkyDome);

    this.auroraRibbons = [];
    const colors = [0x3bf0c5, 0x5ce1e6, 0x7ee081, 0xffd166];
    const opacities = [0.22, 0.19, 0.16, 0.14];
    for (let i = 0; i < 4; i++) {
      const geo = new THREE.PlaneGeometry(224, 30, 40, 4);
      const mat = new THREE.MeshBasicMaterial({
        color: colors[i],
        transparent: true,
        opacity: opacities[i],
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set((i - 1.5) * 16, 48 + i * 6.5, -94 - i * 9);
      mesh.rotation.x = 0.2 + i * 0.03;
      mesh.rotation.y = (i - 1.5) * 0.08;
      this.scene.add(mesh);
      this.auroraRibbons.push({ mesh, geo, mat, baseOpacity: opacities[i], phase: i * 1.55 });
    }

    const starCount = 320;
    const pos = new Float32Array(starCount * 3);
    const starTex = createSoftGlowTexture(32, [255, 255, 255], [180, 235, 255]);
    for (let i = 0; i < starCount; i++) {
      const theta = (((i * 9301 + 49297) % 233280) / 233280) * Math.PI * 2;
      const phi = (((i * 49297 + 9301) % 233280) / 233280) * Math.PI * 0.44;
      const rad = 195;
      pos[i * 3] = Math.cos(theta) * Math.sin(phi) * rad;
      pos[i * 3 + 1] = Math.cos(phi) * rad + 12;
      pos[i * 3 + 2] = Math.sin(theta) * Math.sin(phi) * rad;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xeef9ff,
      map: starTex || null,
      size: 2.1,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.scene.add(new THREE.Points(starGeo, starMat));
  }

  _buildGlacialMountainRing() {
    const peakPlacements = [];
    const totalCandidates = 48;
    for (let i = 0; i < totalCandidates; i++) {
      const angle = (i / totalCandidates) * Math.PI * 2 + (i % 3) * 0.045;
      const radius = 96 + (i % 5) * 3.0; // r = 96..108m outside MAX_VALLEY_RADIUS = 68
      const px = Math.cos(angle) * radius;
      const pz = Math.sin(angle) * radius;
      // Keep the northern Observatory canyon pass (|x| < 24, z < -55) framed & open!
      if (Math.abs(px) < 24 && pz < -55) continue;

      const isPassFlank = Math.abs(px) >= 24 && Math.abs(px) < 38 && pz < -55;
      const widthScale = (0.85 + (i % 4) * 0.16) * (isPassFlank ? 1.15 : 1.0);
      const heightScale = (0.78 + ((i * 7) % 5) * 0.18) * (isPassFlank ? 1.28 : 1.0);
      const rotY = (i * 1.37) % (Math.PI * 2);
      const py = this._baseHeight(px, pz) - 2.2;
      peakPlacements.push({ x: px, y: py, z: pz, widthScale, heightScale, rotY, idx: i });
    }

    const n = peakPlacements.length;
    if (!n) return;

    const peakGeo = new THREE.ConeGeometry(13.5, 34, 5);
    const peakMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.68,
      metalness: 0.18,
      flatShading: true,
    });
    const capGeo = new THREE.ConeGeometry(6.9, 15.2, 5);
    const capMat = new THREE.MeshStandardMaterial({
      color: 0xf0f9ff,
      emissive: 0x244e73,
      emissiveIntensity: 0.24,
      roughness: 0.36,
      metalness: 0.08,
      flatShading: true,
    });

    const peaksInst = new THREE.InstancedMesh(peakGeo, peakMat, n);
    const capsInst = new THREE.InstancedMesh(capGeo, capMat, n);
    const rockPalette = [
      new THREE.Color(0x1b3754),
      new THREE.Color(0x23476b),
      new THREE.Color(0x172f49),
      new THREE.Color(0x2b557d),
    ];

    peakPlacements.forEach((p, idx) => {
      const peakH = 34 * p.heightScale;
      this._tmpEuler.set(0, p.rotY, 0);
      this._tmpQuat.setFromEuler(this._tmpEuler);

      this._tmpPos.set(p.x, p.y + peakH * 0.5, p.z);
      this._tmpScale.set(p.widthScale, p.heightScale, p.widthScale * 0.92);
      this._tmpMat4.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
      peaksInst.setMatrixAt(idx, this._tmpMat4);
      peaksInst.setColorAt(idx, rockPalette[p.idx % rockPalette.length]);

      const capH = 15.2 * p.heightScale;
      this._tmpPos.set(p.x, p.y + peakH - capH * 0.48 + 0.15, p.z);
      this._tmpScale.set(p.widthScale * 1.03, p.heightScale, p.widthScale * 0.95);
      this._tmpMat4.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
      capsInst.setMatrixAt(idx, this._tmpMat4);
    });

    peaksInst.instanceMatrix.needsUpdate = true;
    if (peaksInst.instanceColor) peaksInst.instanceColor.needsUpdate = true;
    capsInst.instanceMatrix.needsUpdate = true;
    this.scene.add(peaksInst, capsInst);
    this.mountainMeshes = { peaksInst, capsInst };
  }

  _buildDeformableSnow() {
    const geo = new THREE.PlaneGeometry(VALLEY_SIZE, VALLEY_SIZE, GRID_SEGMENTS, GRID_SEGMENTS);
    geo.rotateX(-Math.PI / 2);

    const count = geo.attributes.position.count;
    this.snowBaseY = new Float32Array(count);
    this.snowCarve = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    const posAttr = geo.attributes.position;
    for (let i = 0; i < count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const y = this._baseHeight(x, z);
      this.snowBaseY[i] = y;
      posAttr.setY(i, y + 0.42);
      const shade = 0.91 + Math.min(0.08, y * 0.015);
      colors[i * 3] = shade * 0.92;
      colors[i * 3 + 1] = shade * 0.97;
      colors[i * 3 + 2] = 1.0;
    }

    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.56,
      metalness: 0.06,
    });

    this.snowMesh = new THREE.Mesh(geo, mat);
    this.scene.add(this.snowMesh);
  }

  _tintSnowDisc(wx, wz, radius, mode = "permafrost") {
    if (!this.snowMesh) return;
    const geo = this.snowMesh.geometry;
    const posAttr = geo.attributes.position;
    const colAttr = geo.attributes.color;
    const cellSize = VALLEY_SIZE / GRID_SEGMENTS;
    const gxCenter = Math.round(((wx + VALLEY_HALF) / VALLEY_SIZE) * GRID_SEGMENTS);
    const gzCenter = Math.round(((wz + VALLEY_HALF) / VALLEY_SIZE) * GRID_SEGMENTS);
    const cellSpan = Math.ceil((radius + 1.0) / cellSize);

    let dirty = false;
    for (
      let gz = Math.max(0, gzCenter - cellSpan);
      gz <= Math.min(GRID_SEGMENTS, gzCenter + cellSpan);
      gz++
    ) {
      for (
        let gx = Math.max(0, gxCenter - cellSpan);
        gx <= Math.min(GRID_SEGMENTS, gxCenter + cellSpan);
        gx++
      ) {
        const idx = gz * (GRID_SEGMENTS + 1) + gx;
        const vx = posAttr.getX(idx);
        const vz = posAttr.getZ(idx);
        const dist = Math.hypot(vx - wx, vz - wz);
        if (dist <= radius) {
          const blend = 1 - dist / radius;
          if (mode === "permafrost") {
            posAttr.setY(idx, this.snowBaseY[idx] + 0.42 + 0.34 * blend);
            colAttr.setXYZ(idx, 0.18 + 0.12 * (1 - blend), 0.44 + 0.2 * (1 - blend), 0.92);
          } else {
            posAttr.setY(idx, this.snowBaseY[idx] + 0.12);
            colAttr.setXYZ(idx, 0.22, 0.84, 0.88);
          }
          dirty = true;
        }
      }
    }

    if (dirty) {
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
      this._recomputeSnowNormalsWindow(gxCenter, gzCenter, cellSpan);
    }
  }

  _recomputeSnowNormalsWindow(gxCenter, gzCenter, cellSpan) {
    if (!this.snowMesh) return;
    const geo = this.snowMesh.geometry;
    const posAttr = geo.attributes.position;
    const normAttr = geo.attributes.normal;
    if (!normAttr) return;

    const cellSize = VALLEY_SIZE / GRID_SEGMENTS;
    const stride = GRID_SEGMENTS + 1;
    const gx0 = Math.max(0, gxCenter - cellSpan - 1);
    const gx1 = Math.min(GRID_SEGMENTS, gxCenter + cellSpan + 1);
    const gz0 = Math.max(0, gzCenter - cellSpan - 1);
    const gz1 = Math.min(GRID_SEGMENTS, gzCenter + cellSpan + 1);

    for (let gz = gz0; gz <= gz1; gz++) {
      const zU = Math.max(0, gz - 1);
      const zD = Math.min(GRID_SEGMENTS, gz + 1);
      const dz = Math.max(0.01, (zD - zU) * cellSize);
      for (let gx = gx0; gx <= gx1; gx++) {
        const xL = Math.max(0, gx - 1);
        const xR = Math.min(GRID_SEGMENTS, gx + 1);
        const dx = Math.max(0.01, (xR - xL) * cellSize);
        const dhdx = (posAttr.getY(gz * stride + xR) - posAttr.getY(gz * stride + xL)) / dx;
        const dhdz = (posAttr.getY(zD * stride + gx) - posAttr.getY(zU * stride + gx)) / dz;
        const invLen = 1 / Math.hypot(dhdx, 1, dhdz);
        normAttr.setXYZ(gz * stride + gx, -dhdx * invLen, invLen, -dhdz * invLen);
      }
    }
    normAttr.needsUpdate = true;
  }

  _refreshSnowSurfaceOnly() {
    if (!this.snowMesh) return;
    const posAttr = this.snowMesh.geometry.attributes.position;
    const colAttr = this.snowMesh.geometry.attributes.color;
    for (let i = 0; i < posAttr.count; i++) {
      this.snowCarve[i] = 0;
      const y = this.snowBaseY[i];
      posAttr.setY(i, y + 0.42);
      const shade = 0.91 + Math.min(0.08, y * 0.015);
      colAttr.setXYZ(i, shade * 0.92, shade * 0.97, 1.0);
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    this.snowMesh.geometry.computeVertexNormals();
    this._clearSnowLilies();
    this.opposition?.reapplyPermafrostTint();
  }

  resetFreshSnow() {
    this._refreshSnowSurfaceOnly();
    this.opposition?.refreshIntactPods();
  }

  _buildSnowLilyPool() {
    const lilyGeo = new THREE.ConeGeometry(0.24, 0.52, 5);
    lilyGeo.rotateX(Math.PI);
    const lilyMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x3bf0c5,
      emissiveIntensity: 0.65,
      roughness: 0.22,
    });
    this.snowLilyMesh = new THREE.InstancedMesh(lilyGeo, lilyMat, MAX_SNOW_LILIES);
    this.snowLilyMesh.frustumCulled = false;
    this.snowLilies = [];
    this.lilyCursor = 0;
    this.activeLilyCount = 0;
    this._lilyDistAccum = 0;

    this._tmpScale.set(0, 0, 0);
    this._tmpPos.set(0, -20, 0);
    this._tmpQuat.identity();
    this._tmpMat4.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
    const defaultCol = new THREE.Color(0x5ce1e6);
    for (let i = 0; i < MAX_SNOW_LILIES; i++) {
      this.snowLilyMesh.setMatrixAt(i, this._tmpMat4);
      this.snowLilyMesh.setColorAt(i, defaultCol);
      this.snowLilies.push({
        active: false,
        x: 0,
        y: 0,
        z: 0,
        rotY: 0,
        scale: 0,
        targetScale: 1,
      });
    }
    this.snowLilyMesh.instanceMatrix.needsUpdate = true;
    if (this.snowLilyMesh.instanceColor) this.snowLilyMesh.instanceColor.needsUpdate = true;
    this.scene.add(this.snowLilyMesh);
  }

  _clearSnowLilies() {
    if (!this.snowLilyMesh) return;
    this._tmpPos.set(0, -20, 0);
    this._tmpQuat.identity();
    this._tmpScale.set(0, 0, 0);
    this._tmpMat4.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
    for (let i = 0; i < MAX_SNOW_LILIES; i++) {
      this.snowLilies[i].active = false;
      this.snowLilies[i].scale = 0;
      this.snowLilyMesh.setMatrixAt(i, this._tmpMat4);
    }
    this.activeLilyCount = 0;
    this.lilyCursor = 0;
    this._lilyDistAccum = 0;
    this.snowLilyMesh.instanceMatrix.needsUpdate = true;
  }

  _spawnSnowLilyAt(wx, wy, wz, isBioluminescent = false, isPrism = false) {
    if (!this.snowLilyMesh) return;
    const idx = this.lilyCursor;
    this.lilyCursor = (this.lilyCursor + 1) % MAX_SNOW_LILIES;
    const rec = this.snowLilies[idx];
    if (!rec.active) {
      this.activeLilyCount = Math.min(MAX_SNOW_LILIES, this.activeLilyCount + 1);
    }
    rec.active = true;
    rec.x = wx;
    rec.y = wy;
    rec.z = wz;
    rec.rotY = (idx * 1.7) % (Math.PI * 2);
    rec.scale = 0.08;
    rec.targetScale = isBioluminescent ? 1.25 : isPrism ? 1.12 : 0.85;

    const palette = isBioluminescent
      ? [0x7ee081, 0x45f0df, 0xb8f2e6]
      : isPrism
      ? [0xffd166, 0x45f0df, 0xff9b71, 0x7ee081]
      : [0xaee8ff, 0x62f5e4];
    const col = new THREE.Color(palette[idx % palette.length]);
    this.snowLilyMesh.setColorAt(idx, col);
    if (this.snowLilyMesh.instanceColor) this.snowLilyMesh.instanceColor.needsUpdate = true;

    this._tmpPos.set(wx, wy, wz);
    this._tmpEuler.set(0, rec.rotY, 0);
    this._tmpQuat.setFromEuler(this._tmpEuler);
    this._tmpScale.setScalar(rec.scale);
    this._tmpMat4.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
    this.snowLilyMesh.setMatrixAt(idx, this._tmpMat4);
    this.snowLilyMesh.instanceMatrix.needsUpdate = true;
  }

  _carveSnowAt(wx, wz, radius) {
    if (!this.snowMesh) return 0;
    const geo = this.snowMesh.geometry;
    const posAttr = geo.attributes.position;
    const colAttr = geo.attributes.color;
    const cellSize = VALLEY_SIZE / GRID_SEGMENTS;
    const gxCenter = Math.round(((wx + VALLEY_HALF) / VALLEY_SIZE) * GRID_SEGMENTS);
    const gzCenter = Math.round(((wz + VALLEY_HALF) / VALLEY_SIZE) * GRID_SEGMENTS);
    const cellSpan = Math.ceil((radius + 1.4) / cellSize);

    const hasPrism = this.rigState.upgrades.includes("prismatic_trail") || this.rigState.inSurge;
    const isThermal = Boolean(this.opposition && this.opposition.rigThermalChargeSec > 0);
    let newlyCarved = 0;
    let dirty = false;

    for (
      let gz = Math.max(0, gzCenter - cellSpan);
      gz <= Math.min(GRID_SEGMENTS, gzCenter + cellSpan);
      gz++
    ) {
      for (
        let gx = Math.max(0, gxCenter - cellSpan);
        gx <= Math.min(GRID_SEGMENTS, gxCenter + cellSpan);
        gx++
      ) {
        const idx = gz * (GRID_SEGMENTS + 1) + gx;
        const vx = posAttr.getX(idx);
        const vz = posAttr.getZ(idx);
        const dist = Math.hypot(vx - wx, vz - wz);

        if (dist < radius) {
          const strength = Math.min(1, (1 - dist / radius) * 1.45);
          if (strength > this.snowCarve[idx] || isThermal) {
            if (this.snowCarve[idx] < 0.35 && strength >= 0.35) newlyCarved += 1;
            this.snowCarve[idx] = Math.max(this.snowCarve[idx], strength);
            posAttr.setY(idx, this.snowBaseY[idx] + 0.42 * (1 - this.snowCarve[idx] * 0.95));

            if (isThermal) {
              colAttr.setXYZ(
                idx,
                0.98,
                0.52 + 0.22 * (1 - strength),
                0.22 * (1 - strength * 0.6)
              );
            } else if (hasPrism) {
              const hueWave = 0.5 + 0.5 * Math.sin(vx * 0.22 + vz * 0.22);
              colAttr.setXYZ(
                idx,
                0.22 + hueWave * 0.72,
                0.88 - hueWave * 0.12,
                0.82 + (1 - hueWave) * 0.16
              );
            } else {
              colAttr.setXYZ(
                idx,
                0.86 * (1 - strength) + 0.16 * strength,
                0.94 * (1 - strength) + 0.78 * strength,
                1.0 * (1 - strength) + 0.86 * strength
              );
            }
            dirty = true;
          }
        } else if (dist < radius + 1.1 && this.snowCarve[idx] < 0.12) {
          const ridge = Math.sin(((dist - radius) / 1.1) * Math.PI) * 0.24;
          const curY = posAttr.getY(idx);
          const targetRidgeY = this.snowBaseY[idx] + 0.42 + ridge;
          if (targetRidgeY > curY) {
            posAttr.setY(idx, targetRidgeY);
            dirty = true;
          }
        }
      }
    }

    if (dirty) {
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
      this._recomputeSnowNormalsWindow(gxCenter, gzCenter, cellSpan);
    }

    if (newlyCarved > 0) {
      const m2 = newlyCarved * cellSize * cellSize;
      this.carvedCountAccum += m2;
      if (this.carvedCountAccum >= 18) {
        const chunks = Math.floor(this.carvedCountAccum / 18);
        this.carvedCountAccum -= chunks * 18;
        this._emitWorldActivity(chunks * 18, chunks, "snowClearedM2");
      }
    }
    return newlyCarved;
  }

  _buildMoonSanctuaryAndObservatory() {
    const ringGeo = new THREE.RingGeometry(4.2, 5.1, 40);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xaee8ff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    this.moonRing = new THREE.Mesh(ringGeo, ringMat);
    this.moonRing.position.set(0, this._baseHeight(0, 0) + 0.48, 0);
    this.scene.add(this.moonRing);

    const crescentGeo = new THREE.TorusGeometry(1.38, 0.11, 12, 32, Math.PI * 1.44);
    const crescentMat = new THREE.MeshStandardMaterial({
      color: 0xfff3c4,
      emissive: 0xffd166,
      emissiveIntensity: 0.88,
      roughness: 0.18,
      metalness: 0.45,
    });
    this.moonTotem = new THREE.Mesh(crescentGeo, crescentMat);
    this.moonTotem.position.set(0, 4.85, 0);
    this.moonTotem.rotation.z = 0.38;
    const moonStar = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.36, 0),
      new THREE.MeshStandardMaterial({
        color: 0xaee8ff,
        emissive: 0x45f0df,
        emissiveIntensity: 1.1,
      })
    );
    this.moonTotem.add(moonStar);
    this.scene.add(this.moonTotem);

    this.observatoryGroup = new THREE.Group();
    const obsZ = -60;
    const obsY = this._baseHeight(0, obsZ);
    this.observatoryGroup.position.set(0, obsY, obsZ);

    const baseMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(5.2, 7.2, 6, 8),
      new THREE.MeshStandardMaterial({ color: 0x1d3554, roughness: 0.4, metalness: 0.3 })
    );
    baseMesh.position.y = 3;
    this.observatoryGroup.add(baseMesh);

    const spireMesh = new THREE.Mesh(
      new THREE.ConeGeometry(3.8, 16, 8),
      new THREE.MeshStandardMaterial({ color: 0x2d537d, roughness: 0.25, metalness: 0.45 })
    );
    spireMesh.position.y = 14;
    this.observatoryGroup.add(spireMesh);

    this.observatoryRings = [];
    for (let t = 0; t < 6; t++) {
      const rMesh = new THREE.Mesh(
        new THREE.TorusGeometry(4.6 - t * 0.42, 0.22, 10, 28),
        new THREE.MeshStandardMaterial({
          color: 0xffd166,
          emissive: 0x3bf0c5,
          emissiveIntensity: 0.15,
        })
      );
      rMesh.position.y = 5.5 + t * 2.7;
      rMesh.rotation.x = Math.PI / 2;
      this.observatoryGroup.add(rMesh);
      this.observatoryRings.push(rMesh);
    }

    this.observatorySummitCrystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.15, 0),
      new THREE.MeshStandardMaterial({
        color: 0xffd166,
        emissive: 0x45f0df,
        emissiveIntensity: 0.85,
      })
    );
    this.observatorySummitCrystal.position.y = 23.2;
    this.observatoryGroup.add(this.observatorySummitCrystal);

    this.scene.add(this.observatoryGroup);
  }

  setObservatoryTier(tier = 1) {
    const clamped = clampFinite(tier, 0, 6, 0);
    this.rigState.observatoryTier = clamped;
    if (!this.observatoryRings) return;
    this.observatoryRings.forEach((ring, idx) => {
      const lit = idx < clamped;
      ring.material.color.setHex(lit ? 0xffd166 : 0x33506e);
      ring.material.emissive.setHex(lit ? 0x3bf0c5 : 0x102030);
      ring.material.emissiveIntensity = lit ? 0.95 : 0.1;
    });
    if (this.observatorySummitCrystal) {
      this.observatorySummitCrystal.material.emissiveIntensity = clamped >= 6 ? 1.35 : 0.55;
    }
  }

  _buildFrostGuardian() {
    const gx = -18;
    const gz = -54;
    const gy = this._baseHeight(gx, gz);

    const g = new THREE.Group();
    g.name = "frost_guardian_colossus";
    g.position.set(gx, gy, gz);
    g.rotation.y = 0.28;

    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x1b3350,
      roughness: 0.45,
      metalness: 0.25,
    });
    const armorMat = new THREE.MeshToonMaterial({
      color: 0x2b5d8c,
      gradientMap: this.toonRamp,
    });

    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 7.0, 2.8, 8), stoneMat);
    pedestal.position.y = 1.4;
    const baseRingGeo = new THREE.RingGeometry(6.5, 7.4, 36);
    baseRingGeo.rotateX(-Math.PI / 2);
    const baseRing = new THREE.Mesh(
      baseRingGeo,
      new THREE.MeshBasicMaterial({ color: 0x45f0df, side: THREE.DoubleSide })
    );
    baseRing.position.y = 0.55;
    g.add(pedestal, baseRing);

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 2.2, 6.8, 6), armorMat);
    torso.position.y = 6.2;
    g.add(torso);

    for (const sx of [-3.8, 3.8]) {
      const pauldron = new THREE.Mesh(new THREE.DodecahedronGeometry(2.05, 0), armorMat);
      pauldron.position.set(sx, 8.6, 0);
      g.add(pauldron);
    }

    this.guardianArms = [];
    for (const sx of [-4.7, 4.7]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 4.2, 1.4), armorMat);
      arm.position.set(sx, 5.4, 0.5);
      g.add(arm);
      this.guardianArms.push(arm);
    }

    const helm = new THREE.Mesh(new THREE.OctahedronGeometry(1.95, 0), armorMat);
    helm.position.y = 11.4;
    this.guardianVisorMat = new THREE.MeshBasicMaterial({ color: 0x45f0df });
    const visor = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.28, 0.45), this.guardianVisorMat);
    visor.position.set(0, 11.5, 1.55);
    g.add(helm, visor);

    for (const cx of [-0.9, 0, 0.9]) {
      const spire = new THREE.Mesh(
        new THREE.ConeGeometry(0.42, cx === 0 ? 2.8 : 2.1, 4),
        new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xf4a62a, emissiveIntensity: 0.7 })
      );
      spire.position.set(cx, 13.4, 0);
      g.add(spire);
    }

    this.guardianRunes = [];
    for (const rx of [-1.8, -0.6, 0.6, 1.8]) {
      const rMat = new THREE.MeshStandardMaterial({
        color: 0x45f0df,
        emissive: 0x2ec4b6,
        emissiveIntensity: 0.85,
      });
      const rune = new THREE.Mesh(new THREE.OctahedronGeometry(0.58, 0), rMat);
      rune.position.set(rx, 6.8, 2.75);
      g.add(rune);
      this.guardianRunes.push(rune);
    }

    this.guardianBeamMat = new THREE.MeshBasicMaterial({
      color: 0x45f0df,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.guardianBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 3.6, 44, 16, 1, true),
      this.guardianBeamMat
    );
    this.guardianBeam.position.y = 22;
    this.guardianBeam.visible = false;
    g.add(this.guardianBeam);

    this.guardianGroup = g;
    this.frostGuardian = g;
    this.scene.add(g);
  }

  triggerGuardianAwakening(worldId = "W1") {
    const hex = GUARDIAN_WORLD_COLORS[worldId] || 0x45f0df;
    this.guardianAwakeTimer = 4.8;
    this.guardianAwakeWorldId = worldId;
    this.guardianAwakeningCount += 1;

    if (this.guardianVisorMat) this.guardianVisorMat.color.setHex(hex);
    if (this.guardianBeamMat) {
      this.guardianBeamMat.color.setHex(hex);
      this.guardianBeamMat.opacity = 0.85;
    }
    if (this.guardianBeam) this.guardianBeam.visible = true;
    for (const r of this.guardianRunes || []) {
      r.material.color.setHex(hex);
      r.material.emissive.setHex(hex);
      r.material.emissiveIntensity = 1.25;
    }

    const gy = this._baseHeight(-18, -54);
    this._spawnCrystalBurst(-18, gy + 9.0, -54, 72);
    this.triggerSkyWhale();
    this.audio?.playGuardianAwakening?.();
  }

  _buildLiftGaragePad() {
    const gx = -24;
    const gz = 16;
    const gy = this._baseHeight(gx, gz);

    const g = new THREE.Group();
    g.name = "open_air_lift_garage";
    g.position.set(gx, gy, gz);
    g.rotation.y = 0.55;

    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x24344d,
      roughness: 0.45,
      metalness: 0.5,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      emissive: 0xf4a62a,
      emissiveIntensity: 0.85,
    });

    const deck = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.3, 8.2), steelMat);
    deck.position.y = 0.28;
    g.add(deck);

    for (const rz of [-4.7, 4.7]) {
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.22, 1.8), steelMat);
      ramp.position.set(0, 0.16, rz);
      ramp.rotation.x = rz < 0 ? 0.14 : -0.14;
      g.add(ramp);
    }

    const padRingGeo = new THREE.RingGeometry(4.5, 5.2, 32);
    padRingGeo.rotateX(-Math.PI / 2);
    const padRing = new THREE.Mesh(
      padRingGeo,
      new THREE.MeshBasicMaterial({ color: 0xffd166, side: THREE.DoubleSide })
    );
    padRing.position.y = 0.46;
    g.add(padRing);

    for (const px of [-3.6, 3.6]) {
      for (const pz of [-3.2, 3.2]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 4.6, 8), steelMat);
        post.position.set(px, 2.3, pz);
        g.add(post);
      }
    }
    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.34, 0.46), steelMat);
    crossBeam.position.set(0, 4.6, 0);
    g.add(crossBeam);

    const wrench = new THREE.Group();
    wrench.name = "garage_holo_wrench";
    wrench.position.set(0, 6.2, 0);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.7, 0.18), accentMat);
    const jawTop = new THREE.Mesh(
      new THREE.TorusGeometry(0.46, 0.15, 8, 16, Math.PI * 1.35),
      accentMat
    );
    jawTop.position.y = 1.05;
    jawTop.rotation.z = 0.45;
    wrench.add(handle, jawTop);
    g.add(wrench);

    this.garageHoloWrench = wrench;
    this.garageGroup = g;
    this.garagePad = g;
    this.scene.add(g);
  }

  _buildOuterFrontierBiomes() {
    const outerRoot = new THREE.Group();
    outerRoot.name = "FrostwakeOuterBiomes";
    this.outerBiomesGroup = outerRoot;
    this.calderaGeyserVents = [];
    this.calderaSteamRings = [];
    this.singingCrystalChimes = [];
    this.causewayPylons = [];

    // 1. Thermal Geyser Caldera around (-44, 22): hot-spring pools, amber rim stones, steam rings & Updraft Geyser Vents
    const calderaGrp = new THREE.Group();
    calderaGrp.name = "ThermalGeyserCaldera";
    const poolMat = new THREE.MeshStandardMaterial({
      color: 0x3bf0c5,
      emissive: 0x14b8a6,
      emissiveIntensity: 0.92,
      roughness: 0.14,
      metalness: 0.18,
      transparent: true,
      opacity: 0.88,
    });
    const amberStoneMat = new THREE.MeshStandardMaterial({
      color: 0xf4a62a,
      emissive: 0xd97706,
      emissiveIntensity: 0.46,
      roughness: 0.55,
      metalness: 0.18,
      flatShading: true,
    });
    const plumeMat = new THREE.MeshBasicMaterial({
      color: 0x8ef3ff,
      transparent: true,
      opacity: 0.44,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const rimStoneGeo = new THREE.DodecahedronGeometry(0.58, 0);
    const steamRingGeo = new THREE.TorusGeometry(1.12, 0.11, 8, 20);
    steamRingGeo.rotateX(Math.PI / 2);

    const calderaSpecs = [
      { id: "caldera_vent_0", x: -44, z: 22, poolR: 3.4 },
      { id: "caldera_vent_1", x: -50, z: 25, poolR: 2.85 },
      { id: "caldera_vent_2", x: -39, z: 27, poolR: 2.75 },
    ];

    calderaSpecs.forEach((sp, vIdx) => {
      const vy = this._baseHeight(sp.x, sp.z);
      const ventGrp = new THREE.Group();
      ventGrp.name = sp.id;
      ventGrp.position.set(sp.x, vy, sp.z);

      const poolDisc = new THREE.Mesh(
        new THREE.CylinderGeometry(sp.poolR, sp.poolR * 0.92, 0.24, 20),
        poolMat
      );
      poolDisc.position.y = 0.34;
      ventGrp.add(poolDisc);

      for (let r = 0; r < 8; r++) {
        const ang = (r / 8) * Math.PI * 2 + vIdx * 0.4;
        const stone = new THREE.Mesh(rimStoneGeo, amberStoneMat);
        const sScale = 0.85 + (r % 3) * 0.18;
        stone.scale.set(sScale * 1.15, sScale * 0.78, sScale);
        stone.position.set(
          Math.cos(ang) * (sp.poolR + 0.24),
          0.42,
          Math.sin(ang) * (sp.poolR + 0.24)
        );
        stone.rotation.y = ang;
        ventGrp.add(stone);
      }

      const nozzle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.48, 0.72, 0.56, 10),
        amberStoneMat
      );
      nozzle.position.y = 0.48;
      const plumeMesh = new THREE.Mesh(
        new THREE.ConeGeometry(0.72, 2.8, 10, 1, true),
        plumeMat
      );
      plumeMesh.rotation.x = Math.PI;
      plumeMesh.position.y = 1.85;
      ventGrp.add(nozzle, plumeMesh);

      for (let s = 0; s < 2; s++) {
        const sMat = new THREE.MeshBasicMaterial({
          color: 0xc4f9ff,
          transparent: true,
          opacity: 0.42,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const sRing = new THREE.Mesh(steamRingGeo, sMat);
        sRing.position.y = 0.8 + s * 1.5;
        ventGrp.add(sRing);
        this.calderaSteamRings.push({
          mesh: sRing,
          mat: sMat,
          phase: vIdx * 0.33 + s * 0.5,
        });
      }

      calderaGrp.add(ventGrp);
      this.calderaGeyserVents.push({
        id: sp.id,
        x: sp.x,
        y: vy,
        z: sp.z,
        radius: 3.6,
        cooldown: 0,
        plumeMesh,
        group: ventGrp,
      });
    });
    outerRoot.add(calderaGrp);

    // 2. Prism Ice-Crystal Ridge around (45, -10): translucent cyan/amethyst arches & Singing Crystal Chimes
    const prismGrp = new THREE.Group();
    prismGrp.name = "PrismIceCrystalRidge";
    const cyanArchMat = new THREE.MeshStandardMaterial({
      color: 0x5ce1e6,
      emissive: 0x2ec4b6,
      emissiveIntensity: 0.62,
      roughness: 0.12,
      metalness: 0.25,
      transparent: true,
      opacity: 0.82,
      flatShading: true,
    });
    const amethystArchMat = new THREE.MeshStandardMaterial({
      color: 0xc084fc,
      emissive: 0x7c3aed,
      emissiveIntensity: 0.62,
      roughness: 0.14,
      metalness: 0.28,
      transparent: true,
      opacity: 0.82,
      flatShading: true,
    });

    const archSpecs = [
      { x: 43, z: -4, rotY: 0.32, spanR: 4.3, amethyst: false },
      { x: 46, z: -10, rotY: 0.0, spanR: 5.1, amethyst: true },
      { x: 43, z: -16, rotY: -0.32, spanR: 4.3, amethyst: false },
    ];
    archSpecs.forEach((ar) => {
      const ay = this._baseHeight(ar.x, ar.z);
      const aGrp = new THREE.Group();
      aGrp.position.set(ar.x, ay, ar.z);
      aGrp.rotation.y = ar.rotY;
      const archMesh = new THREE.Mesh(
        new THREE.TorusGeometry(ar.spanR, 0.4, 8, 22, Math.PI),
        ar.amethyst ? amethystArchMat : cyanArchMat
      );
      archMesh.position.y = 0.4;
      aGrp.add(archMesh);

      for (const sx of [-1, 1]) {
        const spire = new THREE.Mesh(
          new THREE.ConeGeometry(0.92, 6.2, 6),
          sx < 0 ? cyanArchMat : amethystArchMat
        );
        spire.position.set(sx * (ar.spanR + 0.55), 2.9, 0);
        spire.rotation.z = -sx * 0.18;
        aGrp.add(spire);
      }
      prismGrp.add(aGrp);
    });

    const chimeSpecs = [
      { id: "prism_chime_0", x: 41.5, z: -4.5 },
      { id: "prism_chime_1", x: 45.0, z: -10.0 },
      { id: "prism_chime_2", x: 41.5, z: -15.5 },
    ];
    chimeSpecs.forEach((ch, cIdx) => {
      const cy = this._baseHeight(ch.x, ch.z);
      const cGrp = new THREE.Group();
      cGrp.name = ch.id;
      cGrp.position.set(ch.x, cy, ch.z);

      const chimeMat = new THREE.MeshStandardMaterial({
        color: cIdx === 1 ? 0xc084fc : 0x5ce1e6,
        emissive: cIdx === 1 ? 0x7c3aed : 0x2ec4b6,
        emissiveIntensity: 0.68,
        roughness: 0.14,
        metalness: 0.35,
        transparent: true,
        opacity: 0.9,
      });

      const haloRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.22, 0.09, 8, 20),
        chimeMat
      );
      haloRing.rotation.x = Math.PI / 2;
      haloRing.position.y = 3.55;
      cGrp.add(haloRing);

      const rods = [];
      for (let r = -1; r <= 1; r++) {
        const rod = new THREE.Mesh(
          new THREE.CylinderGeometry(0.13, 0.23, 2.15 - Math.abs(r) * 0.28, 6),
          chimeMat
        );
        rod.position.set(r * 0.56, 2.35 + Math.abs(r) * 0.14, 0);
        cGrp.add(rod);
        rods.push(rod);
      }

      prismGrp.add(cGrp);
      this.singingCrystalChimes.push({
        id: ch.id,
        index: cIdx,
        x: ch.x,
        y: cy,
        z: ch.z,
        baseColorHex: cIdx === 1 ? 0xc084fc : 0x5ce1e6,
        baseEmissiveHex: cIdx === 1 ? 0x7c3aed : 0x2ec4b6,
        chimeMat,
        haloRing,
        rods,
        group: cGrp,
        pulseTimer: 0,
        audioCooldown: 0,
        pulsingGold: false,
        chimeCount: 0,
      });
    });
    outerRoot.add(prismGrp);

    // 3. Northern Observatory Causeway leading toward (0, -56): sequential starlight beacon pylons
    const causewayGrp = new THREE.Group();
    causewayGrp.name = "NorthernObservatoryCauseway";
    const pylonStoneMat = new THREE.MeshStandardMaterial({
      color: 0x1d3554,
      roughness: 0.42,
      metalness: 0.3,
      flatShading: true,
    });
    const pylonStagesZ = [-38, -44, -50, -56];
    pylonStagesZ.forEach((pz, stageIdx) => {
      for (const sx of [-6.8, 6.8]) {
        const py = this._baseHeight(sx, pz);
        const pGrp = new THREE.Group();
        pGrp.name = `causeway_pylon_${stageIdx}_${sx < 0 ? "W" : "E"}`;
        pGrp.position.set(sx, py, pz);

        const shaft = new THREE.Mesh(
          new THREE.CylinderGeometry(0.36, 0.58, 4.4, 6),
          pylonStoneMat
        );
        shaft.position.y = 2.2;

        const orbMat = new THREE.MeshStandardMaterial({
          color: 0x3b5d80,
          emissive: 0x15304a,
          emissiveIntensity: 0.22,
          roughness: 0.18,
          metalness: 0.38,
        });
        const crownOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.48, 0), orbMat);
        crownOrb.position.y = 5.05;

        const ringMesh = new THREE.Mesh(
          new THREE.TorusGeometry(0.68, 0.065, 8, 18),
          orbMat
        );
        ringMesh.rotation.x = Math.PI / 2;
        ringMesh.position.y = 4.55;

        pGrp.add(shaft, crownOrb, ringMesh);
        causewayGrp.add(pGrp);
        this.causewayPylons.push({
          stageIndex: stageIdx,
          x: sx,
          y: py,
          z: pz,
          lit: false,
          intensity: 0.22,
          orbMat,
          crownOrb,
          ringMesh,
          group: pGrp,
        });
      }
    });
    outerRoot.add(causewayGrp);

    this.scene.add(outerRoot);
  }

  _buildExpeditionBeacons() {
    const grp = new THREE.Group();
    grp.name = "FrostwakeExpeditionBeacons";
    this.expeditionBeaconGroup = grp;
    this.expeditionBeacons = [];

    const goldRingMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      emissive: 0xf4a62a,
      emissiveIntensity: 0.95,
      roughness: 0.18,
      metalness: 0.45,
    });
    const turquoiseRingMat = new THREE.MeshStandardMaterial({
      color: 0x45f0df,
      emissive: 0x2ec4b6,
      emissiveIntensity: 0.95,
      roughness: 0.18,
      metalness: 0.35,
    });
    const needleMat = new THREE.MeshBasicMaterial({
      color: 0x8ef3ff,
      transparent: true,
      opacity: 0.46,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    for (let i = 0; i < 3; i++) {
      const bGrp = new THREE.Group();
      bGrp.name = `FrostwakeExpeditionBeacon_${i}`;

      const outerRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.72, 0.11, 8, 26),
        goldRingMat
      );
      outerRing.rotation.x = Math.PI / 2;
      outerRing.position.y = 0.55;

      const innerRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.14, 0.08, 8, 22),
        turquoiseRingMat
      );
      innerRing.rotation.x = Math.PI / 2;
      innerRing.position.y = 1.15;

      const needle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.22, 9.2, 8, 1, true),
        needleMat
      );
      needle.position.y = 4.8;

      const crownGem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.42, 0),
        goldRingMat
      );
      crownGem.position.y = 2.35;

      bGrp.add(outerRing, innerRing, needle, crownGem);
      grp.add(bGrp);
      this.expeditionBeacons.push({
        index: i,
        waypointId: null,
        collected: false,
        group: bGrp,
        outerRing,
        innerRing,
        needle,
        crownGem,
      });
    }

    const burstMat = new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.expeditionBurstMesh = new THREE.Mesh(
      new THREE.TorusGeometry(1.45, 0.14, 8, 26),
      burstMat
    );
    this.expeditionBurstMesh.rotation.x = Math.PI / 2;
    this.expeditionBurstMesh.visible = false;
    grp.add(this.expeditionBurstMesh);

    this.scene.add(grp);
    this._syncExpeditionBeacons();
  }

  _syncExpeditionBeacons() {
    if (!this.expeditionBeacons || !this.fieldExpedition) return;
    const waypoints = Array.isArray(this.fieldExpedition.waypoints)
      ? this.fieldExpedition.waypoints
      : [];
    for (let i = 0; i < this.expeditionBeacons.length; i++) {
      const slot = this.expeditionBeacons[i];
      const wp = waypoints[i];
      if (!wp) {
        slot.group.visible = false;
        slot.collected = true;
        continue;
      }
      const by = this._baseHeight(wp.x, wp.z) + 0.22;
      slot.waypointId = wp.id;
      slot.collected = Boolean(wp.collected);
      slot.group.position.set(wp.x, by, wp.z);
      slot.group.visible = !wp.collected;
    }
  }

  _triggerExpeditionBurst(wx, wy, wz) {
    this._spawnCrystalBurst(wx, wy + 1.2, wz, 22);
    if (this.expeditionBurstMesh) {
      this._expeditionBurstTimer = 0.58;
      this.expeditionBurstMesh.position.set(wx, wy + 0.65, wz);
      this.expeditionBurstMesh.scale.setScalar(1.0);
      this.expeditionBurstMesh.material.opacity = 0.9;
      this.expeditionBurstMesh.visible = true;
    }
  }

  _buildAlpinePines() {
    const trunkGeo = new THREE.CylinderGeometry(0.32, 0.48, 2.2, 6);
    const coneGeo1 = new THREE.ConeGeometry(2.3, 4.4, 7);
    const coneGeo2 = new THREE.ConeGeometry(1.75, 3.6, 7);
    const snowCapGeo = new THREE.ConeGeometry(1.8, 1.5, 7);

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4b382a, roughness: 0.9 });
    const pineMat = new THREE.MeshStandardMaterial({ color: 0x1f5c4e, roughness: 0.75 });
    const capMat = new THREE.MeshStandardMaterial({ color: 0xeef8ff, roughness: 0.5 });

    this.pines = [];
    const placements = [];
    for (let i = 0; i < 52; i++) {
      const angle = (i / 52) * Math.PI * 2 + (i % 3) * 0.08;
      const dist = 72 + (i % 4) * 4.5; // 72..85.5m outside MAX_VALLEY_RADIUS=68
      const px = Math.cos(angle) * dist;
      const pz = Math.sin(angle) * dist;
      if (Math.abs(px) < 25 && pz < -52) continue; // Keep Northern Vista sightline clear!
      const s = 0.85 + (i % 5) * 0.14;
      const py = this._baseHeight(px, pz);
      placements.push({ x: px, y: py, z: pz, scale: s, phase: i * 0.7 });
      this.pines.push({ x: px, y: py, z: pz, scale: s, phase: i * 0.7 });
    }

    const n = placements.length;
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, n);
    const lowerCones = new THREE.InstancedMesh(coneGeo1, pineMat, n);
    const upperCones = new THREE.InstancedMesh(coneGeo2, pineMat, n);
    const snowCaps = new THREE.InstancedMesh(snowCapGeo, capMat, n);

    placements.forEach((p, idx) => {
      this._tmpQuat.identity();
      this._tmpScale.setScalar(p.scale);

      this._tmpPos.set(p.x, p.y + 1.1 * p.scale, p.z);
      this._tmpMat4.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
      trunks.setMatrixAt(idx, this._tmpMat4);

      this._tmpPos.set(p.x, p.y + 3.6 * p.scale, p.z);
      this._tmpMat4.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
      lowerCones.setMatrixAt(idx, this._tmpMat4);

      this._tmpPos.set(p.x, p.y + 5.6 * p.scale, p.z);
      this._tmpMat4.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
      upperCones.setMatrixAt(idx, this._tmpMat4);

      this._tmpPos.set(p.x, p.y + 6.7 * p.scale, p.z);
      this._tmpMat4.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
      snowCaps.setMatrixAt(idx, this._tmpMat4);
    });

    for (const im of [trunks, lowerCones, upperCones, snowCaps]) {
      im.instanceMatrix.needsUpdate = true;
      this.scene.add(im);
    }
    this.pineMeshes = { trunks, lowerCones, upperCones, snowCaps };
  }

  _buildRimIceCrystalClusters() {
    const shards = [];
    for (let i = 0; i < 32; i++) {
      const angle = (i / 32) * Math.PI * 2 + 0.05;
      const dist = 70 + (i % 4) * 1.65; // r = 70..74.95m strictly outside MAX_VALLEY_RADIUS = 68
      const cx = Math.cos(angle) * dist;
      const cz = Math.sin(angle) * dist;
      if (Math.abs(cx) < 25 && cz < -52) continue;
      const cy = this._baseHeight(cx, cz);

      const clusterSpecs = [
        { ox: 0, oz: 0, tiltX: 0.06, tiltZ: -0.05, sy: 1.18, sr: 1.0 },
        { ox: 0.85, oz: -0.55, tiltX: 0.28, tiltZ: -0.24, sy: 0.82, sr: 0.78 },
        { ox: -0.78, oz: 0.62, tiltX: -0.24, tiltZ: 0.26, sy: 0.72, sr: 0.72 },
      ];
      clusterSpecs.forEach((sp, sIdx) => {
        shards.push({
          x: cx + sp.ox,
          y: cy + 1.55 * sp.sy,
          z: cz + sp.oz,
          tiltX: sp.tiltX,
          rotY: (i * 0.9 + sIdx * 2.1) % (Math.PI * 2),
          tiltZ: sp.tiltZ,
          sr: sp.sr * (0.9 + (i % 3) * 0.12),
          sy: sp.sy * (0.88 + ((i + sIdx) % 3) * 0.14),
          colorIdx: (i + sIdx) % 3,
        });
      });
    }

    if (!shards.length) return;
    const crystalGeo = new THREE.ConeGeometry(0.76, 3.8, 6);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x1e8f88,
      emissiveIntensity: 0.52,
      roughness: 0.15,
      metalness: 0.22,
      transparent: true,
      opacity: 0.88,
      flatShading: true,
    });
    const inst = new THREE.InstancedMesh(crystalGeo, crystalMat, shards.length);
    const palette = [
      new THREE.Color(0x8ef3ff),
      new THREE.Color(0x45f0df),
      new THREE.Color(0xc4f8ff),
    ];

    shards.forEach((sh, idx) => {
      this._tmpPos.set(sh.x, sh.y, sh.z);
      this._tmpEuler.set(sh.tiltX, sh.rotY, sh.tiltZ);
      this._tmpQuat.setFromEuler(this._tmpEuler);
      this._tmpScale.set(sh.sr, sh.sy, sh.sr);
      this._tmpMat4.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
      inst.setMatrixAt(idx, this._tmpMat4);
      inst.setColorAt(idx, palette[sh.colorIdx]);
    });

    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    this.scene.add(inst);
    this.rimCrystalMesh = inst;
  }

  _buildSnowfallParticles() {
    const count = 280;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (((i * 733 + 19) % 1000) / 1000 - 0.5) * 136;
      pos[i * 3 + 1] = (((i * 389 + 7) % 1000) / 1000) * 28 + 1;
      pos[i * 3 + 2] = (((i * 571 + 31) % 1000) / 1000 - 0.5) * 136;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const snowTex = createSoftGlowTexture(32, [255, 255, 255], [180, 240, 255]);
    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      map: snowTex || null,
      size: 0.86,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.snowfall = new THREE.Points(geo, mat);
    this.scene.add(this.snowfall);
  }

  _buildSprayAndShardPools() {
    const sprayCount = 64;
    const shardCount = 96;

    const sprayGeo = new THREE.DodecahedronGeometry(0.24, 0);
    const sprayMat = new THREE.MeshStandardMaterial({ color: 0xf2fbff, roughness: 0.45 });
    this.sprayInstMesh = new THREE.InstancedMesh(sprayGeo, sprayMat, sprayCount);
    this.sprayInstMesh.frustumCulled = false;

    const shardGeo = new THREE.OctahedronGeometry(0.42, 0);
    const shardMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x2ec4b6,
      emissiveIntensity: 0.6,
      roughness: 0.2,
    });
    this.shardInstMesh = new THREE.InstancedMesh(shardGeo, shardMat, shardCount);
    this.shardInstMesh.frustumCulled = false;

    this._tmpPos.set(0, -30, 0);
    this._tmpQuat.identity();
    this._tmpScale.set(0, 0, 0);
    this._tmpMat4.compose(this._tmpPos, this._tmpQuat, this._tmpScale);

    this.sprayPool = [];
    for (let i = 0; i < sprayCount; i++) {
      this.sprayInstMesh.setMatrixAt(i, this._tmpMat4);
      this.sprayPool.push({
        index: i,
        x: 0,
        y: -30,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        rx: 0,
        ry: 0,
        life: 0,
      });
    }

    const cyanCol = new THREE.Color(0x45f0df);
    const goldCol = new THREE.Color(0xffd166);
    this.shardPool = [];
    for (let i = 0; i < shardCount; i++) {
      this.shardInstMesh.setMatrixAt(i, this._tmpMat4);
      this.shardInstMesh.setColorAt(i, i % 2 === 0 ? cyanCol : goldCol);
      this.shardPool.push({
        index: i,
        x: 0,
        y: -30,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        rx: 0,
        ry: 0,
        life: 0,
      });
    }

    this.sprayInstMesh.instanceMatrix.needsUpdate = true;
    this.shardInstMesh.instanceMatrix.needsUpdate = true;
    if (this.shardInstMesh.instanceColor) this.shardInstMesh.instanceColor.needsUpdate = true;
    this.scene.add(this.sprayInstMesh, this.shardInstMesh);
  }

  _buildSkyWhale() {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: 0x62f5e4,
      emissive: 0x2dd4bf,
      emissiveIntensity: 0.85,
      transparent: true,
      opacity: 0.78,
      roughness: 0.2,
    });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(2.6, 9.5, 8, 16), mat);
    body.rotation.x = Math.PI / 2;
    const finL = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.28, 2.2), mat);
    finL.position.set(-3.6, -0.3, 1.2);
    finL.rotation.z = 0.28;
    const finR = finL.clone();
    finR.position.x = 3.6;
    finR.rotation.z = -0.28;
    const fluke = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.25, 1.8), mat);
    fluke.position.set(0, 0.3, -6.4);
    g.add(body, finL, finR, fluke);
    g.visible = false;
    this.skyWhale = g;
    this.scene.add(g);
  }

  triggerSkyWhale() {
    this.whaleTimer = 11.0;
    if (this.skyWhale) this.skyWhale.visible = true;
    this.audio?.playWhaleSong?.();
  }

  triggerOverdriveStreakWonder() {
    this.triggerSkyWhale();
  }

  setSurgeMode(inSurge) {
    this.rigState.inSurge = Boolean(inSurge);
    for (const r of this.auroraRibbons || []) {
      r.mat.opacity = this.rigState.inSurge ? Math.min(0.42, r.baseOpacity * 1.9) : r.baseOpacity;
    }
  }

  setEncounterDockOpen(isOpen) {
    this.encounterDockOpen = Boolean(isOpen);
    if (this.opposition) {
      this.opposition.setPaused(this.isOppositionPaused());
    }
  }

  isOppositionPaused() {
    return this.encounterDockOpen === true || this.activeGateSlot !== null;
  }

  _persistFrostwakeExpeditionCount(completedTotal) {
    const prog = this._boundProgressRef;
    if (!prog || typeof prog !== "object" || Object.isFrozen(prog)) return;
    try {
      if (!prog.games || typeof prog.games !== "object" || Object.isFrozen(prog.games)) return;
      if (!prog.games.frostwake || typeof prog.games.frostwake !== "object") {
        prog.games.frostwake = {};
      }
      if (Object.isFrozen(prog.games.frostwake)) return;
      const cur = Math.max(0, Math.floor(Number(prog.games.frostwake.expeditionsCompleted) || 0));
      if (cur < completedTotal) {
        prog.games.frostwake.expeditionsCompleted = completedTotal;
      }
    } catch (_) {}
  }

  applyLoadout(progress = {}, crossRealmUnlocks = {}, borrowedToy = null) {
    const prevProgressRef = this._boundProgressRef;
    this._boundProgressRef = progress || null;

    const rawExpDone = progress?.games?.frostwake?.expeditionsCompleted;
    if (Number.isFinite(Number(rawExpDone))) {
      const targetCompleted = Math.max(0, Math.floor(Number(rawExpDone)));
      const isNewProfileRef = progress !== prevProgressRef;
      if (
        !this.fieldExpedition ||
        targetCompleted > this.fieldExpedition.completedTotal ||
        (isNewProfileRef && targetCompleted !== this.fieldExpedition.completedTotal)
      ) {
        this.fieldExpedition = createFieldExpeditionState("frostwake", targetCompleted);
        this._syncExpeditionBeacons();
      }
    } else if (!this.fieldExpedition) {
      this.fieldExpedition = createFieldExpeditionState("frostwake", 0);
      this._syncExpeditionBeacons();
    }

    const baseChassis =
      progress?.games?.frostwake?.equippedChassis ||
      progress?.equippedChassis ||
      "terra_dozer";
    const baseUpgrades = Array.isArray(progress?.ownedUpgrades)
      ? [...progress.ownedUpgrades]
      : [];

    const borrowedRig =
      borrowedToy?.frostwakeRig ||
      (borrowedToy && (borrowedToy.chassisId || borrowedToy.equippedChassis)
        ? {
            chassisId: borrowedToy.chassisId || borrowedToy.equippedChassis,
            upgrades: Array.isArray(borrowedToy.upgrades)
              ? borrowedToy.upgrades
              : Array.isArray(borrowedToy.ownedUpgrades)
              ? borrowedToy.ownedUpgrades
              : [],
          }
        : null);

    const effectiveChassis = borrowedRig?.chassisId || baseChassis;
    const borrowedUpgrades = Array.isArray(borrowedRig?.upgrades) ? borrowedRig.upgrades : [];
    const effectiveUpgrades = borrowedRig
      ? Array.from(new Set([...baseUpgrades, ...borrowedUpgrades]))
      : baseUpgrades;

    const cru = crossRealmUnlocks && typeof crossRealmUnlocks === "object" ? crossRealmUnlocks : {};
    const oddCreatures = Array.isArray(progress?.games?.oddroot?.hatchedCreatures)
      ? progress.games.oddroot.hatchedCreatures
      : [];
    const discoveredMysteries = Array.isArray(progress?.discoveredMysteries)
      ? progress.discoveredMysteries
      : [];
    const bastionUpgrades = Array.isArray(progress?.games?.arc_bastion?.bastionUpgrades)
      ? progress.games.arc_bastion.bastionUpgrades
      : [];
    const resolvedCrossRealm = {
      astroToadCabMascot: Boolean(
        cru.astroToadCabMascot ||
          cru.cryoToadMascot ||
          cru.astroToadUnlocked ||
          oddCreatures.includes("zero_g_toad") ||
          oddCreatures.includes("astro_toad")
      ),
      cryoBuoyancyTrim: Boolean(
        cru.cryoBuoyancyTrim ||
          cru.astroToadCabMascot ||
          cru.astroToadUnlocked ||
          (progress?.nodes?.["W1.3"]?.stage || 0) >= 2
      ),
      bioluminescentSnowLilies: Boolean(
        cru.bioluminescentSnowLilies ||
          cru.snowLiliesUnlocked ||
          oddCreatures.length >= 3 ||
          (progress?.nodes?.["W2.1"]?.stage || 0) >= 2
      ),
      goldenMosaicPlowTrim: Boolean(
        cru.goldenMosaicPlowTrim ||
          cru.goldenMosaicTrimUnlocked ||
          cru.goldenMosaicTrim ||
          cru.mosaicUnlocked ||
          cru.frostwakePlowTrim === "golden_mosaic" ||
          progress?.games?.oddroot?.mosaicForged ||
          (progress?.nodes?.["W6.3"]?.stage || 0) >= 2
      ),
      silverMoonLantern: Boolean(
        cru.silverMoonLantern || discoveredMysteries.includes("moon_center")
      ),
      clockworkCrestUnlocked: Boolean(
        cru.clockworkCrestUnlocked ||
          cru.clockworkSentinelSynced ||
          effectiveUpgrades.includes("ab_auto_turret") ||
          effectiveUpgrades.includes("ab_chronos_harp") ||
          bastionUpgrades.includes("ab_auto_turret") ||
          bastionUpgrades.includes("ab_chronos_harp") ||
          (progress?.games?.arc_bastion?.contraptionsShattered || 0) >= 5
      ),
    };

    const borrowedMeta = borrowedRig
      ? {
          active: true,
          owner: borrowedToy.owner || borrowedToy.ownerName || "sibling",
          displayName:
            borrowedToy.displayName || borrowedToy.ownerName || borrowedToy.owner || "Sibling",
        }
      : { active: false, owner: null, displayName: null };

    this.crossRealmState = resolvedCrossRealm;
    this.borrowedToyState = borrowedMeta;
    this.rigState.crossRealm = resolvedCrossRealm;
    this.rigState.borrowedMeta = borrowedMeta;

    this.rebuildRig(effectiveChassis, effectiveUpgrades, resolvedCrossRealm, borrowedMeta);
    if (this.ghostController) {
      this.ghostController.loadFromProgress(progress);
      this.ghostController.setChassisAppearance(effectiveChassis);
    }
  }

  _createClockworkCrestMesh() {
    const crest = new THREE.Group();
    crest.name = "frostwake_clockwork_crest";
    crest.userData = { crossRealm: "frostwake_clockwork_crest" };

    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      emissive: 0xd97706,
      emissiveIntensity: 0.85,
      roughness: 0.22,
      metalness: 0.72,
    });
    const jewelMat = new THREE.MeshStandardMaterial({
      color: 0x45f0df,
      emissive: 0x2ec4b6,
      emissiveIntensity: 1.05,
      roughness: 0.14,
      metalness: 0.35,
    });

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.34, 8), brassMat);
    mast.position.y = -0.18;
    crest.add(mast);

    const outerGear = new THREE.Group();
    outerGear.add(new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.055, 8, 20), brassMat));
    for (let t = 0; t < 8; t++) {
      const ang = (t / 8) * Math.PI * 2;
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.13, 0.07), brassMat);
      tooth.position.set(Math.cos(ang) * 0.37, Math.sin(ang) * 0.37, 0);
      tooth.rotation.z = ang;
      outerGear.add(tooth);
    }

    const innerGear = new THREE.Group();
    innerGear.add(new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.036, 8, 16), jewelMat));
    for (let s = 0; s < 4; s++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.035, 0.04), brassMat);
      spoke.rotation.z = (s / 4) * Math.PI;
      innerGear.add(spoke);
    }

    const hubGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), jewelMat);
    crest.add(outerGear, innerGear, hubGem);

    return { crest, outerGear, innerGear };
  }

  _createStarlightWinchMesh() {
    const turret = new THREE.Group();
    turret.name = "titan_harpoon_turret";
    turret.userData = { upgrade: "titan_harpoon" };

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      emissive: 0xf4a62a,
      emissiveIntensity: 0.9,
      roughness: 0.2,
      metalness: 0.55,
    });
    const cyanMat = new THREE.MeshStandardMaterial({
      color: 0x45f0df,
      emissive: 0x2ec4b6,
      emissiveIntensity: 0.85,
    });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 0.26, 10), goldMat);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.52, 10), goldMat);
    drum.rotation.z = Math.PI / 2;
    drum.position.y = 0.24;
    const spear = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.55, 8), cyanMat);
    spear.rotation.x = Math.PI / 2;
    spear.position.set(0, 0.32, -0.45);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.46, 5), goldMat);
    tip.rotation.x = -Math.PI / 2;
    tip.position.set(0, 0.32, -1.28);

    turret.add(base, drum, spear, tip);
    return turret;
  }

  rebuildRig(
    chassisId = "terra_dozer",
    upgrades = [],
    crossRealm = this.crossRealmState || {},
    borrowedMeta = this.borrowedToyState || { active: false }
  ) {
    const cleanChassis = chassisId === "aurora_sled" ? "aurora_sled" : "terra_dozer";
    this.rigState.chassisId = cleanChassis;
    this.rigState.upgrades = Array.isArray(upgrades) ? [...upgrades] : [];
    this.crossRealmState = crossRealm || {};
    this.borrowedToyState = borrowedMeta || { active: false };
    if (!this.scene) return;

    if (this.rigGroup) {
      this.scene.remove(this.rigGroup);
    }

    const spec =
      FROSTWAKE_CHASSIS_SPECS.find((c) => c.id === cleanChassis) || FROSTWAKE_CHASSIS_SPECS[0];
    const hasWide = this.rigState.upgrades.includes("wide_blade");
    const hasBoost = this.rigState.upgrades.includes("ion_boosters");
    const hasCrown = this.rigState.upgrades.includes("celestial_crown");
    const hasFox = this.rigState.upgrades.includes("spirit_fox");
    const hasHarpoon = this.rigState.upgrades.includes("titan_harpoon");

    const g = new THREE.Group();
    g.rotation.order = "YXZ";
    this.rigWheels = [];
    this.sledPlasmaCones = [];
    this.rigThrusterCones = [];

    const primaryColor = hasCrown ? 0xffd86b : spec.primaryHex;
    const bodyMat = new THREE.MeshStandardMaterial({
      color: primaryColor,
      roughness: 0.28,
      metalness: 0.42,
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: spec.secondaryHex,
      roughness: 0.5,
      metalness: 0.34,
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xdbe9f6,
      roughness: 0.18,
      metalness: 0.82,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x8ef3ff,
      emissive: 0x1b6b7d,
      emissiveIntensity: 0.35,
      roughness: 0.08,
      metalness: 0.55,
      transparent: true,
      opacity: 0.72,
    });
    const glowMat = new THREE.MeshStandardMaterial({
      color: spec.glowHex,
      emissive: spec.glowHex,
      emissiveIntensity: 0.95,
      roughness: 0.18,
    });
    const cyanHubMat = new THREE.MeshStandardMaterial({
      color: 0x45f0df,
      emissive: 0x3bf0c5,
      emissiveIntensity: 1.1,
      roughness: 0.16,
    });
    const magmaMat = new THREE.MeshStandardMaterial({
      color: 0xff8c42,
      emissive: 0xff6b2b,
      emissiveIntensity: 1.3,
      roughness: 0.16,
    });
    const plasmaEdgeMat = new THREE.MeshStandardMaterial({
      color: 0xfff0b5,
      emissive: hasWide ? 0xff7b29 : 0x45f0df,
      emissiveIntensity: 1.45,
      roughness: 0.12,
    });

    if (cleanChassis === "aurora_sled") {
      // Faceted streamlined hover-fuselage + dorsal energy spine + nose splitter
      const facetedBodyMat = new THREE.MeshStandardMaterial({
        color: primaryColor,
        roughness: 0.22,
        metalness: 0.48,
        flatShading: true,
      });
      const hull = new THREE.Mesh(new THREE.ConeGeometry(1.24, 4.65, 6), facetedBodyMat);
      hull.rotation.x = -Math.PI / 2;
      hull.scale.set(1.08, 1.0, 0.68);
      hull.position.set(0, 1.02, 0.05);
      g.add(hull);

      const ventralKeel = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.24, 3.65), darkMat);
      ventralKeel.position.set(0, 0.68, 0.18);
      const dorsalSpine = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 2.85), glowMat);
      dorsalSpine.position.set(0, 1.38, 0.55);
      g.add(ventralKeel, dorsalSpine);

      const noseCone = new THREE.Mesh(new THREE.ConeGeometry(0.54, 1.35, 4), chromeMat);
      noseCone.rotation.x = -Math.PI / 2;
      noseCone.rotation.z = Math.PI / 4;
      noseCone.scale.set(1.15, 1.0, 0.55);
      noseCone.position.set(0, 0.92, -2.35);
      const noseSplitter = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.08, 0.62), plasmaEdgeMat);
      noseSplitter.position.set(0, 0.74, -2.18);
      g.add(noseCone, noseSplitter);

      // Cockpit coaming + pilot silhouette + iridescent crystal bubble canopy
      const coaming = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.78, 0.22, 12), darkMat);
      coaming.scale.set(0.94, 1.0, 1.48);
      coaming.position.set(0, 1.28, 0.24);
      g.add(coaming);

      const pilotSuitMat = new THREE.MeshStandardMaterial({
        color: 0x101c2e,
        roughness: 0.45,
        metalness: 0.3,
      });
      const pilotTorso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.26, 6, 10), pilotSuitMat);
      pilotTorso.position.set(0, 1.42, 0.3);
      pilotTorso.rotation.x = -0.22;
      const pilotHelm = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), darkMat);
      pilotHelm.position.set(0, 1.68, 0.22);
      const pilotVisor = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.14), cyanHubMat);
      pilotVisor.position.set(0, 1.69, 0.08);
      g.add(pilotTorso, pilotHelm, pilotVisor);

      const canopy = new THREE.Mesh(
        new THREE.SphereGeometry(0.84, 18, 14),
        new THREE.MeshStandardMaterial({
          color: 0xc4f9ff,
          emissive: 0x3bf0c5,
          emissiveIntensity: 0.36,
          roughness: 0.06,
          metalness: 0.38,
          transparent: true,
          opacity: 0.56,
        })
      );
      canopy.scale.set(0.92, 0.72, 1.5);
      canopy.position.set(0, 1.5, 0.24);
      g.add(canopy);

      // Swept gull-winglet stabilizers with glowing leading-edge trim
      const halfSpan = (hasWide ? 4.8 : 3.5) * 0.5;
      for (const side of [-1, 1]) {
        const innerWing = new THREE.Mesh(
          new THREE.BoxGeometry(halfSpan * 0.56, 0.12, 1.48),
          facetedBodyMat
        );
        innerWing.position.set(side * halfSpan * 0.36, 0.96, 0.32);
        innerWing.rotation.z = side * 0.18;
        innerWing.rotation.y = -side * 0.16;

        const outerWing = new THREE.Mesh(
          new THREE.BoxGeometry(halfSpan * 0.58, 0.1, 1.18),
          darkMat
        );
        outerWing.position.set(side * halfSpan * 0.82, 0.98, 0.58);
        outerWing.rotation.z = -side * 0.12;
        outerWing.rotation.y = -side * 0.26;

        const wingTrim = new THREE.Mesh(
          new THREE.BoxGeometry(halfSpan * 0.96, 0.07, 0.14),
          glowMat
        );
        wingTrim.position.set(side * halfSpan * 0.58, 0.99, -0.22);
        wingTrim.rotation.y = -side * 0.22;

        const wingletFin = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, 0.68, 0.96),
          glowMat
        );
        wingletFin.position.set(side * (halfSpan + 0.04), 1.24, 0.78);
        wingletFin.rotation.z = -side * 0.28;

        g.add(innerWing, outerWing, wingTrim, wingletFin);
      }

      // Twin sculpted hover-skids + underneath cyan ground-glow rings
      const groundGlowMat = new THREE.MeshBasicMaterial({
        color: 0x45f0df,
        transparent: true,
        opacity: 0.58,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const groundGlowGeo = new THREE.RingGeometry(0.2, 0.54, 20);
      groundGlowGeo.rotateX(-Math.PI / 2);

      for (const sx of [-1.28, 1.28]) {
        const pylonF = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.48, 0.28), darkMat);
        pylonF.position.set(sx * 0.86, 0.6, -0.82);
        pylonF.rotation.z = sx > 0 ? -0.32 : 0.32;
        const pylonR = pylonF.clone();
        pylonR.position.z = 0.92;

        const skidMain = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 3.85), chromeMat);
        skidMain.position.set(sx, 0.34, 0.05);
        const skidRail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 3.65), cyanHubMat);
        skidRail.position.set(sx, 0.44, 0.05);
        const skidTip = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.68), glowMat);
        skidTip.position.set(sx, 0.45, -2.06);
        skidTip.rotation.x = 0.36;
        g.add(pylonF, pylonR, skidMain, skidRail, skidTip);

        for (const gz of [-0.95, 0.98]) {
          const glowPad = new THREE.Mesh(groundGlowGeo, groundGlowMat);
          glowPad.position.set(sx, 0.08, gz);
          g.add(glowPad);
        }
      }

      // Twin rear ion-thruster nacelles with pulsing plasma cones
      const plasmaConeMat = new THREE.MeshBasicMaterial({
        color: 0x5ce1e6,
        transparent: true,
        opacity: 0.78,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      for (const sx of [-0.76, 0.76]) {
        const nacelle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.27, 0.33, 1.28, 6),
          darkMat
        );
        nacelle.rotation.x = Math.PI / 2;
        nacelle.position.set(sx, 0.98, 1.66);

        const nozzleRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.26, 0.055, 8, 16),
          cyanHubMat
        );
        nozzleRing.position.set(sx, 0.98, 2.31);

        const plasmaCone = new THREE.Mesh(
          new THREE.ConeGeometry(0.23, 1.28, 12, 1, true),
          plasmaConeMat
        );
        plasmaCone.rotation.x = Math.PI / 2;
        plasmaCone.position.set(sx, 0.98, 2.95);

        g.add(nacelle, nozzleRing, plasmaCone);
        this.sledPlasmaCones.push({ mesh: plasmaCone, baseZ: 2.95, phase: sx > 0 ? 0 : 1.6 });
      }

      // Curved crescent energy prow + inner plasma arc
      const prowW = hasWide ? 4.5 : 3.1;
      const prow = new THREE.Mesh(
        new THREE.TorusGeometry(prowW * 0.42, 0.19, 10, 28, Math.PI),
        hasWide ? magmaMat : glowMat
      );
      prow.rotation.x = Math.PI / 2;
      prow.rotation.z = Math.PI;
      prow.position.set(0, 0.54, -1.58);

      const innerArc = new THREE.Mesh(
        new THREE.TorusGeometry(prowW * 0.35, 0.08, 8, 24, Math.PI),
        plasmaEdgeMat
      );
      innerArc.rotation.x = Math.PI / 2;
      innerArc.rotation.z = Math.PI;
      innerArc.position.set(0, 0.54, -1.48);
      g.add(prow, innerArc);
    } else {
      // Sculpted 6x6 Thermal Dozer: beveled armored chassis + wheel-fender arches
      const lowerTub = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.46, 3.68), darkMat);
      lowerTub.position.set(0, 0.76, 0.22);
      const mainHull = new THREE.Mesh(new THREE.BoxGeometry(2.26, 0.66, 3.42), bodyMat);
      mainHull.position.set(0, 1.18, 0.22);
      const upperBevel = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.18, 3.18), bodyMat);
      upperBevel.position.set(0, 1.56, 0.26);
      const frontGlacis = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.48, 0.88), bodyMat);
      frontGlacis.position.set(0, 1.22, -1.34);
      frontGlacis.rotation.x = 0.38;
      const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(2.34, 0.28, 0.36), darkMat);
      frontBumper.position.set(0, 0.86, -1.64);
      g.add(lowerTub, mainHull, upperBevel, frontGlacis, frontBumper);

      // Rear louvered reactor deck + glowing core slats
      const reactorDeck = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.34, 1.12), darkMat);
      reactorDeck.position.set(0, 1.66, 1.32);
      g.add(reactorDeck);
      for (let r = 0; r < 3; r++) {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.08, 0.14), glowMat);
        slat.position.set(0, 1.85, 1.0 + r * 0.3);
        g.add(slat);
      }

      // Sculpted left/right wheel-fender arches
      for (const sx of [-1.24, 1.24]) {
        const fenderTop = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 3.36), darkMat);
        fenderTop.position.set(sx, 1.24, 0.2);
        const fenderLipF = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.12, 0.48), darkMat);
        fenderLipF.position.set(sx, 1.1, -1.56);
        fenderLipF.rotation.x = 0.52;
        const fenderLipR = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.12, 0.48), darkMat);
        fenderLipR.position.set(sx, 1.1, 1.96);
        fenderLipR.rotation.x = -0.52;
        const sideTrim = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 2.95), glowMat);
        sideTrim.position.set(sx + (sx > 0 ? 0.22 : -0.22), 1.25, 0.2);
        g.add(fenderTop, fenderLipF, fenderLipR, sideTrim);
      }

      // Armored cockpit cab + panoramic tinted glass windshield & side windows + cyan instrument bar
      const cabBase = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.96, 1.66), darkMat);
      cabBase.position.set(0, 1.96, 0.28);
      const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.16, 1.58), bodyMat);
      cabRoof.position.set(0, 2.48, 0.3);
      const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.62, 0.12), glassMat);
      windshield.position.set(0, 2.04, -0.52);
      windshield.rotation.x = 0.24;
      const sideWinL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.52, 1.16), glassMat);
      sideWinL.position.set(-0.91, 2.04, 0.3);
      const sideWinR = sideWinL.clone();
      sideWinR.position.x = 0.91;
      const instrumentBar = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.12, 0.2), cyanHubMat);
      instrumentBar.position.set(0, 1.78, -0.32);
      const lightBar = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.18, 0.28), glowMat);
      lightBar.position.set(0, 2.58, -0.38);
      g.add(cabBase, cabRoof, windshield, sideWinL, sideWinR, instrumentBar, lightBar);

      // Twin front volumetric-style headlight cones
      const headBeamMat = new THREE.MeshBasicMaterial({
        color: 0xbaf7ff,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      for (const hx of [-0.78, 0.78]) {
        const housing = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.24), darkMat);
        housing.position.set(hx, 1.12, -1.62);
        const lens = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.08), plasmaEdgeMat);
        lens.position.set(hx, 1.12, -1.73);
        const beamCone = new THREE.Mesh(
          new THREE.ConeGeometry(0.68, 4.1, 14, 1, true),
          headBeamMat
        );
        beamCone.rotation.x = Math.PI / 2 - 0.11;
        beamCone.position.set(hx, 0.89, -3.76);
        g.add(housing, lens, beamCone);
      }

      // Twin rear angled chrome exhaust stacks with glowing ember tips
      for (const ex of [-0.88, 0.88]) {
        const stackGrp = new THREE.Group();
        stackGrp.position.set(ex, 1.62, 1.48);
        stackGrp.rotation.x = -0.24;
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 1.38, 10), chromeMat);
        pipe.position.y = 0.68;
        const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.72, 8), darkMat);
        shield.position.y = 0.52;
        const emberTip = new THREE.Mesh(
          new THREE.TorusGeometry(0.11, 0.038, 8, 14),
          magmaMat
        );
        emberTip.rotation.x = Math.PI / 2;
        emberTip.position.y = 1.37;
        const emberCore = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, 0.08, 8),
          plasmaEdgeMat
        );
        emberCore.position.y = 1.36;
        stackGrp.add(pipe, shield, emberTip, emberCore);
        g.add(stackGrp);
      }

      // 6x6 rugged Arctic tires + glowing cyan hubcap rings & spokes
      const wheelGeo = new THREE.CylinderGeometry(0.56, 0.56, 0.48, 16);
      wheelGeo.rotateZ(Math.PI / 2);
      const wheelMat = new THREE.MeshStandardMaterial({
        color: 0x16202e,
        roughness: 0.84,
        metalness: 0.15,
      });
      const hubRingGeo = new THREE.TorusGeometry(0.31, 0.052, 8, 16);
      hubRingGeo.rotateY(Math.PI / 2);
      const hubCapGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.06, 12);
      hubCapGeo.rotateZ(Math.PI / 2);

      let wIdx = 0;
      for (const wx of [-1.25, 1.25]) {
        const outSign = wx > 0 ? 1 : -1;
        for (const wz of [-1.05, 0.2, 1.45]) {
          const w = new THREE.Mesh(wheelGeo, wheelMat);
          w.position.set(wx, 0.56, wz);

          const rimCap = new THREE.Mesh(hubCapGeo, chromeMat);
          rimCap.position.x = outSign * 0.23;
          const hubRing = new THREE.Mesh(hubRingGeo, cyanHubMat);
          hubRing.position.x = outSign * 0.25;
          const spokeA = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.08), chromeMat);
          spokeA.position.x = outSign * 0.25;
          const spokeB = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.5), chromeMat);
          spokeB.position.x = outSign * 0.25;
          w.add(rimCap, hubRing, spokeA, spokeB);

          g.add(w);
          this.rigWheels.push({
            mesh: w,
            lx: wx,
            lz: wz,
            baseY: 0.56,
            springY: 0,
            springVel: 0,
            phase: wIdx * 1.15,
            get position() {
              return w.position;
            },
            get rotation() {
              return w.rotation;
            },
          });
          wIdx += 1;
        }
      }

      // Twin hydraulic plow struts
      for (const hx of [-0.66, 0.66]) {
        const cylOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.62, 8), darkMat);
        cylOuter.rotation.x = Math.PI / 2 + 0.14;
        cylOuter.position.set(hx, 0.72, -1.52);
        const pistonRod = new THREE.Mesh(
          new THREE.CylinderGeometry(0.065, 0.065, 0.56, 8),
          chromeMat
        );
        pistonRod.rotation.x = Math.PI / 2 + 0.14;
        pistonRod.position.set(hx, 0.66, -1.84);
        g.add(cylOuter, pistonRod);
      }

      // Fierce Magma-Ribbed V-Plow Blade with serrated side-wings & glowing plasma cutting edge
      const bladeW = (hasWide ? 4.7 : 3.2) * 0.55;
      const bladeGeo = new THREE.BoxGeometry(bladeW, 1.08, 0.26);
      const bladeL = new THREE.Mesh(bladeGeo, hasWide ? magmaMat : bodyMat);
      bladeL.position.set(-bladeW * 0.44, 0.7, -1.96);
      bladeL.rotation.y = 0.28;
      const bladeR = new THREE.Mesh(bladeGeo, hasWide ? magmaMat : bodyMat);
      bladeR.position.set(bladeW * 0.44, 0.7, -1.96);
      bladeR.rotation.y = -0.28;

      // Vertical glowing magma ribs + serrated side-wings on each V-plow half
      for (const side of [-1, 1]) {
        const hostBlade = side < 0 ? bladeL : bladeR;
        for (const ribT of [-0.32, 0, 0.32]) {
          const rib = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.96, 0.32), magmaMat);
          rib.position.set(ribT * bladeW, 0, -0.03);
          hostBlade.add(rib);
        }
        const wingEar = new THREE.Mesh(new THREE.BoxGeometry(0.36, 1.04, 0.24), darkMat);
        wingEar.position.set(side * (bladeW * 0.5 + 0.12), 0.02, -0.14);
        wingEar.rotation.y = -side * 0.52;
        for (const ty of [-0.28, 0.24]) {
          const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.34, 4), magmaMat);
          tooth.rotation.x = -Math.PI / 2;
          tooth.position.set(side * 0.08, ty, -0.18);
          wingEar.add(tooth);
        }
        hostBlade.add(wingEar);
      }

      const prowSplitter = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.14, 4), magmaMat);
      prowSplitter.position.set(0, 0.72, -2.18);
      prowSplitter.rotation.y = Math.PI / 4;

      const magmaStrip = new THREE.Mesh(
        new THREE.BoxGeometry(bladeW * 1.92, 0.2, 0.34),
        hasWide ? magmaMat : glowMat
      );
      magmaStrip.position.set(0, 0.24, -2.04);
      const plasmaEdge = new THREE.Mesh(
        new THREE.BoxGeometry(bladeW * 1.98, 0.09, 0.18),
        plasmaEdgeMat
      );
      plasmaEdge.position.set(0, 0.18, -2.18);
      g.add(bladeL, bladeR, prowSplitter, magmaStrip, plasmaEdge);
    }

    if (hasBoost) {
      const boostFlameMat = new THREE.MeshBasicMaterial({
        color: 0xffd166,
        transparent: true,
        opacity: 0.78,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      for (const tx of [-0.65, 0.65]) {
        const thruster = new THREE.Mesh(
          new THREE.CylinderGeometry(0.24, 0.34, 0.72, 10),
          glowMat
        );
        thruster.rotation.x = Math.PI / 2;
        thruster.position.set(tx, 0.95, 2.15);
        const flame = new THREE.Mesh(
          new THREE.ConeGeometry(0.22, 0.95, 10, 1, true),
          boostFlameMat
        );
        flame.rotation.x = Math.PI / 2;
        flame.position.set(tx, 0.95, 2.95);
        g.add(thruster, flame);
        this.rigThrusterCones.push({ mesh: flame, baseZ: 2.95, phase: tx > 0 ? 0.5 : 2.1 });
      }
    }

    if (hasHarpoon) {
      this.harpoonTurret = this._createStarlightWinchMesh();
      this.harpoonTurret.position.set(0, cleanChassis === "aurora_sled" ? 1.88 : 2.65, 0.25);
      g.add(this.harpoonTurret);
    } else {
      this.harpoonTurret = null;
    }

    if (hasCrown) {
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.09, 10, 24), glowMat);
      halo.rotation.x = Math.PI / 2;
      halo.position.set(0, 3.05, 0.2);
      g.add(halo);
    }

    if (hasFox) {
      this.companionFox = this._createSpiritFoxMesh();
      this.companionFox.position.set(2.4, 0, 0.6);
      g.add(this.companionFox);
    } else {
      this.companionFox = null;
    }

    // Oddroot Cross-Realm Visual Unlocks
    if (this.crossRealmState.astroToadCabMascot) {
      const mascot = new THREE.Group();
      mascot.name = "astro_toad_mascot";
      mascot.userData = { crossRealm: "astro_toad_mascot" };
      const bubble = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0x90f1ef, transparent: true, opacity: 0.34 })
      );
      const toadBody = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 10, 8),
        new THREE.MeshStandardMaterial({ color: 0x7ee081, emissive: 0x2ec4b6, emissiveIntensity: 0.6 })
      );
      toadBody.rotation.z = Math.PI; // Floating upside-down Zero-G Astro-Toad!
      mascot.add(bubble, toadBody);
      mascot.position.set(-0.62, cleanChassis === "aurora_sled" ? 2.25 : 2.95, 0.45);
      g.add(mascot);
      this.astroToadMascot = mascot;
    } else {
      this.astroToadMascot = null;
    }

    if (this.crossRealmState.cryoBuoyancyTrim) {
      const buoy = new THREE.Group();
      buoy.name = "cryo_buoyancy_trim";
      buoy.userData = { crossRealm: "cryo_buoyancy_trim" };
      const railMat = new THREE.MeshStandardMaterial({
        color: 0xc084fc,
        emissive: 0x7c3aed,
        emissiveIntensity: 0.75,
      });
      for (const bx of [-1.32, 1.32]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 2.5), railMat);
        rail.position.set(bx, 0.88, 0.1);
        buoy.add(rail);
      }
      g.add(buoy);
    }

    if (this.crossRealmState.goldenMosaicPlowTrim) {
      const mosaic = new THREE.Group();
      mosaic.name = "golden_mosaic_trim";
      mosaic.userData = { crossRealm: "golden_mosaic_plow_trim" };
      const tileMat = new THREE.MeshStandardMaterial({
        color: 0xffd166,
        emissive: 0xf4a62a,
        emissiveIntensity: 0.95,
      });
      for (let t = 0; t < 4; t++) {
        const tile = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.22, 0.12), tileMat);
        tile.position.set((t - 1.5) * 0.55, 0.92, -1.98);
        mosaic.add(tile);
      }
      g.add(mosaic);
    }

    if (this.crossRealmState.silverMoonLantern) {
      const lantern = new THREE.Mesh(
        new THREE.TorusGeometry(0.28, 0.05, 8, 16, Math.PI * 1.4),
        new THREE.MeshBasicMaterial({ color: 0xaee8ff })
      );
      lantern.name = "silver_moon_lantern";
      lantern.position.set(0, 1.65, 2.05);
      g.add(lantern);
    }

    if (this.crossRealmState.clockworkCrestUnlocked) {
      const built = this._createClockworkCrestMesh();
      built.crest.position.set(0.58, cleanChassis === "aurora_sled" ? 2.08 : 2.82, 0.35);
      g.add(built.crest);
      this.clockworkCrest = built.crest;
      this.clockworkCrestOuter = built.outerGear;
      this.clockworkCrestInner = built.innerGear;
    } else {
      this.clockworkCrest = null;
      this.clockworkCrestOuter = null;
      this.clockworkCrestInner = null;
    }

    if (this.borrowedToyState && this.borrowedToyState.active) {
      const pennant = new THREE.Group();
      pennant.name = "sibling_borrow_pennant";
      pennant.userData = { tag: "sibling_borrow_badge", owner: this.borrowedToyState.owner };
      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 1.35, 6),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      mast.position.y = 0.68;
      const star = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.28, 0),
        new THREE.MeshBasicMaterial({ color: 0xffd166 })
      );
      star.position.y = 1.42;
      pennant.add(mast, star);
      pennant.position.set(0.88, 1.85, 1.55);
      g.add(pennant);
    }

    this.rigGroup = g;
    const groundY = this._baseHeight(this.rigState.x, this.rigState.z);
    this.rigGroup.position.set(this.rigState.x, groundY + 0.15, this.rigState.z);
    this.rigGroup.rotation.set(this.rigState.pitch, this.rigState.heading, this.rigState.roll);
    this.scene.add(this.rigGroup);
  }

  _createSpiritFoxMesh() {
    const fox = new THREE.Group();
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf7fbff, roughness: 0.4 });
    const cyanMat = new THREE.MeshStandardMaterial({
      color: 0x45f0df,
      emissive: 0x2ec4b6,
      emissiveIntensity: 0.65,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.48, 1.05), whiteMat);
    body.position.y = 0.52;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.46, 0.52), whiteMat);
    head.position.set(0, 0.82, -0.52);
    const earL = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.34, 4), cyanMat);
    earL.position.set(-0.16, 1.16, -0.5);
    const earR = earL.clone();
    earR.position.x = 0.16;
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.85, 6), cyanMat);
    tail.rotation.x = -1.1;
    tail.position.set(0, 0.62, 0.78);
    fox.add(body, head, earL, earR, tail);
    return fox;
  }

  populateEncounters(encounters = []) {
    for (const slot of this.gateSlots) {
      if (slot.group && this.scene) this.scene.remove(slot.group);
    }
    this.gateSlots = [];
    for (const f of this.wokenFoxes) {
      if (f.mesh && this.scene) this.scene.remove(f.mesh);
    }
    this.wokenFoxes = [];
    for (const b of this.laserBeams) {
      if (b.mesh && this.scene) this.scene.remove(b.mesh);
    }
    this.laserBeams = [];
    this.activeGateSlot = null;
    if (this.opposition) {
      this.opposition.setPaused(this.isOppositionPaused());
    }

    const coords = [
      { x: 0, z: -11, rotY: 0 },
      { x: -27, z: -26, rotY: 0.42 },
      { x: 27, z: -24, rotY: -0.42 },
      { x: 0, z: -36, rotY: 0 },
    ];

    const validWave = (Array.isArray(encounters) ? encounters : [])
      .filter((enc) => enc && typeof enc === "object")
      .slice(0, 4);

    let activeCoords = coords;
    if (
      validWave.length === 3 &&
      Math.hypot(coords[0].x - this.rigState.x, coords[0].z + 6.0 - this.rigState.z) >= 10.5
    ) {
      const nonOverlapping = coords.filter((c, i) => {
        if (i === 0) return true;
        const appX = c.x + Math.sin(c.rotY) * 6.0;
        const appZ = c.z + Math.cos(c.rotY) * 6.0;
        return Math.hypot(appX - this.rigState.x, appZ - this.rigState.z) >= 10.5;
      });
      if (nonOverlapping.length >= 3) {
        activeCoords = nonOverlapping;
      }
    }

    validWave.forEach((enc, idx) => {
      const pos = activeCoords[idx % activeCoords.length];
      const slot = {
        index: idx,
        encounter: enc,
        x: pos.x,
        z: pos.z,
        y: this._baseHeight(pos.x, pos.z),
        rotY: pos.rotY,
        cleared: false,
        group: null,
      };
      if (this.scene) {
        slot.group = buildEncounter3DGroup(slot);
        this.scene.add(slot.group);
      }
      this.gateSlots.push(slot);
    });

    if (this.ghostController) {
      this.ghostController.startWave(this.rigState);
    }
  }

  areAllEncountersCleared() {
    return this.gateSlots.length > 0 && this.gateSlots.every((s) => Boolean(s.cleared));
  }

  refreshActiveEncounterVisual(updatedEncounter) {
    const validEnc =
      updatedEncounter && typeof updatedEncounter === "object" ? updatedEncounter : null;
    let slot = this.activeGateSlot;
    if (!slot && validEnc) {
      slot =
        this.gateSlots.find(
          (s) => s.encounter === validEnc || (validEnc.uid && s.encounter?.uid === validEnc.uid)
        ) || this.gateSlots[0];
    }
    if (!slot) return;
    if (validEnc) slot.encounter = validEnc;
    if (!this.scene) return;
    if (slot.group) this.scene.remove(slot.group);
    slot.group = buildEncounter3DGroup(slot);
    this.scene.add(slot.group);
    updateEncounterDialPreview(slot, this.dialPreviewValue);
  }

  updateDialPreview(val) {
    this.dialPreviewValue = clampFinite(val, -10000, 10000, 0);
    const slot = this.activeGateSlot || this.gateSlots.find((s) => !s.cleared) || this.gateSlots[0];
    if (!slot) return;
    updateEncounterDialPreview(slot, this.dialPreviewValue);
  }

  engageAutopilotToNextGate() {
    const openSlots = this.gateSlots.filter((s) => !s.cleared);
    if (!openSlots.length) return null;
    let best = openSlots[0];
    if (best.encounter?.worldId !== "W0") {
      let bestD = Infinity;
      for (const s of openSlots) {
        const approachX = s.x + Math.sin(s.rotY) * 6.5;
        const approachZ = s.z + Math.cos(s.rotY) * 6.5;
        const d = Math.hypot(approachX - this.rigState.x, approachZ - this.rigState.z);
        if (d < bestD) {
          bestD = d;
          best = s;
        }
      }
    }
    this.autopilotTarget = {
      x: best.x + Math.sin(best.rotY) * 6.2,
      z: best.z + Math.cos(best.rotY) * 6.2,
      slot: best,
    };
    return best;
  }

  setDriveInputs(steer, throttle, boosting = false) {
    const cleanSteer = clampFinite(steer, -1, 1, 0);
    const cleanThrottle = clampFinite(throttle, -1, 1, 0);
    if (Math.abs(cleanSteer) > 0.05 || Math.abs(cleanThrottle) > 0.05) {
      this.autopilotTarget = null;
    }
    this.rigState.steerInput = cleanSteer;
    this.rigState.throttleInput = cleanThrottle;
    this.rigState.boosting = Boolean(boosting);
  }

  grappleNearestIcePod() {
    if (!this.opposition) return { grappled: false, podId: null };
    const hasHarpoon = this.rigState.upgrades.includes("titan_harpoon");
    return this.opposition.grappleNearestIcePod(
      this.rigState.x,
      this.rigState.y,
      this.rigState.z,
      hasHarpoon
    );
  }

  triggerRealmQuickAction() {
    const hasHarpoon = this.rigState.upgrades.includes("titan_harpoon");
    if (hasHarpoon && this.opposition) {
      const nearPod = this.opposition.findNearestGrapplePod(
        this.rigState.x,
        this.rigState.z,
        HARPOON_GRAPPLE_RANGE,
        false
      );
      if (nearPod) {
        const res = this.grappleNearestIcePod();
        this._refreshSnowSurfaceOnly();
        return res;
      }
    }
    if (!hasHarpoon && this.opposition) {
      this.opposition.grappleNearestIcePod(
        this.rigState.x,
        this.rigState.y,
        this.rigState.z,
        false
      );
    }
    this.resetFreshSnow();
    return true;
  }

  // Live 2-Player Multiplayer Co-Op Adapter Methods (F21)
  getLocalMultiplayerPose() {
    return {
      x: round3(this.rigState.x),
      y: round3(this.rigState.y),
      z: round3(this.rigState.z),
      heading: round3(this.rigState.heading),
      speed: round3(this.rigState.speed),
      chassisOrMount: this.rigState.chassisId,
    };
  }

  syncRemotePartners(peersArray) {
    this.coop?.syncRemotePartners(peersArray);
  }

  playPartnerCoopEvent(event) {
    return this.coop?.playPartnerCoopEvent(event) || null;
  }

  playLocalFlare() {
    return this.coop?.playLocalFlare(this.rigState) || null;
  }

  syncSharedCoins(coinStatesMap) {
    this.coop?.syncSharedCoins(coinStatesMap);
  }

  getSlipstreamBoostState() {
    if (!this.slipstreamVfx) {
      return { active: false, ratio: 0, multiplier: 1.0, overdrive: false };
    }
    return {
      active: this.slipstreamVfx.isActive(),
      ratio: this.slipstreamVfx.getRemainingRatio(),
      multiplier: this.slipstreamVfx.getSpeedMultiplier(),
      overdrive: Boolean(this.slipstreamVfx.overdriveActive),
    };
  }

  setZoneProgressRatio(ratio) {
    this.horizonWonder?.setZoneProgress(clampFinite(ratio, 0, 1, 0.25));
  }

  getActiveBiome() {
    return resolveActiveBiome("frostwake", this.rigState.x, this.rigState.z);
  }

  getFieldExpeditionState() {
    if (!this.fieldExpedition) {
      this.fieldExpedition = createFieldExpeditionState("frostwake", 0);
    }
    return this.fieldExpedition;
  }

  getRobloxSimSnapshot() {
    const timeScaleState = computeSimulationTimeScale({
      dt: this._lastSimDt || 1 / 60,
      encounterDockOpen: this.encounterDockOpen,
      activeGateSlot: Boolean(this.activeGateSlot),
      bulletTimeRequested: Boolean(this.bulletTimeRequested),
      realmId: "frostwake",
    });
    this.simTimeState = timeScaleState;
    return exportRobloxSimSnapshot({
      realmId: "frostwake",
      vehicleState: this.rigState,
      timeScaleState,
      expeditionState: this.getFieldExpeditionState(),
    });
  }

  _stepOuterFrontierBiomes(dt, elapsed, pausedForMath) {
    // 1. Rising steam torus rings & interactive Updraft Geyser Vents at Thermal Geyser Caldera (-44, 22)
    for (const sr of this.calderaSteamRings || []) {
      const cycle = (elapsed * 0.48 + sr.phase) % 1;
      sr.mesh.position.y = 0.65 + cycle * 3.8;
      sr.mesh.scale.setScalar(0.85 + cycle * 0.85);
      sr.mat.opacity = 0.46 * (1 - cycle);
    }

    for (const vent of this.calderaGeyserVents || []) {
      if (vent.cooldown > 0) {
        vent.cooldown = Math.max(0, vent.cooldown - dt);
      }
      if (vent.plumeMesh) {
        const pulse = 0.85 + Math.sin(elapsed * 5.2 + vent.x) * 0.22;
        vent.plumeMesh.scale.set(pulse, 0.9 + Math.sin(elapsed * 4.1) * 0.2, pulse);
      }
      if (!pausedForMath && !this.rigAnim && !this.autopilotTarget && vent.cooldown <= 0) {
        const dVent = Math.hypot(this.rigState.x - vent.x, this.rigState.z - vent.z);
        if (dVent <= vent.radius) {
          vent.cooldown = 6.5;
          this._calderaHopTimer = 0.68;
          this.rigState.y += 0.55;
          if (this.rigGroup) {
            this.rigGroup.position.y = this.rigState.y;
          }
          const boostedSpd = Math.max(finiteOr(this.rigState.speed, 0), 13.8);
          this.rigState.speed = boostedSpd;
          const fwdX = -Math.sin(finiteOr(this.rigState.heading, 0));
          const fwdZ = -Math.cos(finiteOr(this.rigState.heading, 0));
          this.rigState.vx = fwdX * boostedSpd;
          this.rigState.vz = fwdZ * boostedSpd;
          this._spawnCrystalBurst(vent.x, vent.y + 1.4, vent.z, 20);
          this.audio?.playGeyserBurst?.();
          this.onOppositionEvent?.({
            type: "caldera_geyser",
            kind: "caldera_geyser",
            shardsEarned: 3,
            message: "⛲ Caldera Geyser Hop! +3💎",
          });
        }
      }
    }

    // 2. Singing Crystal Chimes at Prism Ice-Crystal Ridge (45, -10)
    for (const ch of this.singingCrystalChimes || []) {
      if (ch.audioCooldown > 0) {
        ch.audioCooldown = Math.max(0, ch.audioCooldown - dt);
      }
      const dChime = Math.hypot(this.rigState.x - ch.x, this.rigState.z - ch.z);
      if (!pausedForMath && dChime <= 6.5) {
        ch.pulseTimer = 2.2;
        ch.pulsingGold = true;
        if (ch.audioCooldown <= 0) {
          ch.audioCooldown = 3.2;
          ch.chimeCount += 1;
          this.audio?.playCrystalChime?.(ch.index);
        }
      } else if (ch.pulseTimer > 0) {
        ch.pulseTimer = Math.max(0, ch.pulseTimer - dt);
        if (ch.pulseTimer <= 0) {
          ch.pulsingGold = false;
        }
      }

      if (ch.pulsingGold) {
        ch.chimeMat.color.setHex(0xffd166);
        ch.chimeMat.emissive.setHex(0xf4a62a);
        ch.chimeMat.emissiveIntensity = 1.25 + Math.sin(elapsed * 8.0 + ch.index) * 0.25;
      } else {
        ch.chimeMat.color.setHex(ch.baseColorHex);
        ch.chimeMat.emissive.setHex(ch.baseEmissiveHex);
        ch.chimeMat.emissiveIntensity = 0.65 + Math.sin(elapsed * 2.4 + ch.index) * 0.1;
      }

      ch.haloRing.rotation.z = elapsed * 1.4 + ch.index;
      ch.rods.forEach((rod, rIdx) => {
        const swayAmp = ch.pulsingGold ? 0.16 : 0.04;
        rod.rotation.z = Math.sin(elapsed * 5.6 + rIdx * 1.3 + ch.index) * swayAmp;
      });
    }

    // 3. Northern Observatory Causeway sequential starlight beacon pylons toward (0, -56)
    const inNorthernCorridor = Math.abs(this.rigState.x) <= 22 && this.rigState.z <= -26;
    for (const py of this.causewayPylons || []) {
      const shouldLight = inNorthernCorridor && this.rigState.z <= py.z + 9.5;
      if (shouldLight) {
        py.lit = true;
      } else if (!inNorthernCorridor) {
        py.lit = false;
      }
      const targetIntensity = py.lit ? 1.35 : 0.22;
      py.intensity += (targetIntensity - py.intensity) * Math.min(1, dt * 6.5);
      py.orbMat.color.setHex(py.lit ? 0xffd166 : 0x3b5d80);
      py.orbMat.emissive.setHex(py.lit ? 0x45f0df : 0x15304a);
      py.orbMat.emissiveIntensity = py.intensity;
      py.crownOrb.rotation.y = elapsed * (py.lit ? 2.6 : 0.8) + py.stageIndex;
      py.ringMesh.rotation.z = elapsed * (py.lit ? 2.0 : 0.5);
    }
  }

  _stepFieldExpedition(dt, elapsed) {
    if (!this.fieldExpedition) {
      this.fieldExpedition = createFieldExpeditionState("frostwake", 0);
      this._syncExpeditionBeacons();
    }

    // Animate 3D expedition beacons
    for (const slot of this.expeditionBeacons || []) {
      if (!slot.group.visible) continue;
      slot.outerRing.rotation.z = elapsed * 1.5 + slot.index;
      slot.innerRing.rotation.z = -elapsed * 2.1 - slot.index;
      slot.innerRing.position.y = 1.15 + Math.sin(elapsed * 3.2 + slot.index) * 0.22;
      slot.crownGem.rotation.y = elapsed * 2.8 + slot.index;
      slot.crownGem.position.y = 2.35 + Math.sin(elapsed * 3.8 + slot.index) * 0.26;
    }

    if (this._expeditionBurstTimer > 0 && this.expeditionBurstMesh) {
      this._expeditionBurstTimer = Math.max(0, this._expeditionBurstTimer - dt);
      const u = 1 - this._expeditionBurstTimer / 0.58;
      this.expeditionBurstMesh.scale.setScalar(1.0 + u * 2.8);
      this.expeditionBurstMesh.material.opacity = Math.max(0, 0.9 * (1 - u));
      if (this._expeditionBurstTimer <= 0) {
        this.expeditionBurstMesh.visible = false;
      }
    }

    // CRITICAL SHARD TIMING GUARDRAIL: only evaluate waypoint collection during pure free-roam!
    if (
      !this.encounterDockOpen &&
      !this.activeGateSlot &&
      !this.rigAnim &&
      !this.autopilotTarget
    ) {
      const res = stepFieldExpedition(this.fieldExpedition, this.rigState.x, this.rigState.z);
      this.fieldExpedition = res.state;
      if (res.justCollectedWaypoint) {
        const wp = res.justCollectedWaypoint;
        this._triggerExpeditionBurst(wp.x, this._baseHeight(wp.x, wp.z) + 0.25, wp.z);
        this._syncExpeditionBeacons();

        if (res.justCompletedExpedition) {
          if (typeof this.audio?.playExpeditionComplete === "function") {
            this.audio.playExpeditionComplete();
          } else {
            this.audio?.playCoinGrab?.();
          }
          this._emitWorldActivity?.(1, res.shardsEarned, "expeditionsCompleted");
          this._persistFrostwakeExpeditionCount(res.state.completedTotal);
          this.onOppositionEvent?.({
            type: "expedition_complete",
            kind: "expedition_complete",
            shardsEarned: 0,
            message:
              "🌟 Expedition Complete: " +
              res.justCompletedExpedition.title +
              "! +" +
              res.shardsEarned +
              "💎",
          });
        } else {
          if (typeof this.audio?.playExpeditionWaypoint === "function") {
            this.audio.playExpeditionWaypoint(res.state.collectedCount);
          } else {
            this.audio?.playCoinGrab?.();
          }
          this.onOppositionEvent?.({
            type: "expedition_waypoint",
            kind: "expedition_waypoint",
            shardsEarned: res.shardsEarned,
            message:
              res.state.icon +
              " " +
              wp.label +
              " (" +
              res.state.collectedCount +
              "/" +
              res.state.targetCount +
              ") +2💎",
          });
        }
      }
    }
  }

  playTwinBeamVisual(isRepel = false) {
    const slot =
      this.activeGateSlot || this.gateSlots.find((s) => !s.cleared) || this.gateSlots[0];
    if (!slot || !this.scene) return;
    const color = isRepel ? 0xffae42 : 0x45f0df;

    for (const offset of [-3.8, 3.8]) {
      const start = new THREE.Vector3(this.rigState.x, this.rigState.y + 1.3, this.rigState.z);
      const end = new THREE.Vector3(
        slot.x + offset * Math.cos(slot.rotY),
        slot.y + 3.2,
        slot.z - offset * Math.sin(slot.rotY)
      );
      const dist = Math.max(0.2, start.distanceTo(end));
      const cyl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, dist, 8),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92 })
      );
      cyl.position.copy(start).lerp(end, 0.5);
      cyl.lookAt(end);
      cyl.rotateX(Math.PI / 2);
      this.scene.add(cyl);
      this.laserBeams.push({ mesh: cyl, life: 0.36 });
    }

    if (isRepel) {
      triggerTwinBeamEncounterFX(slot, true);
      this._spawnCrystalBurst(slot.x, slot.y + 3.2, slot.z, 18);
    }
  }

  playCommitVisual(result = {}, enc = null) {
    const safeRes = result && typeof result === "object" ? result : {};
    const safeEnc = enc && typeof enc === "object" ? enc : null;
    let slot = null;
    if (safeEnc) {
      slot =
        this.gateSlots.find(
          (s) => s.encounter === safeEnc || (safeEnc.uid && s.encounter?.uid === safeEnc.uid)
        ) || null;
    }
    if (!slot) {
      slot = this.activeGateSlot || this.gateSlots.find((s) => !s.cleared) || this.gateSlots[0];
    }
    if (!slot) return;

    applyEncounterCommitFX(this, slot, safeRes, safeEnc);

    if (safeRes.outcome === "clear" || safeRes.outcome === "warm_reveal") {
      const isOverdrive = Boolean(safeRes.overdrive);
      const bx = clampFinite(this.rigState.x, -VALLEY_SIZE, VALLEY_SIZE, 0);
      const by = clampFinite(this.rigState.y, -20, 80, 0);
      const bz = clampFinite(this.rigState.z, -VALLEY_SIZE, VALLEY_SIZE, 0);
      this.slipstreamVfx?.triggerClearBoost({
        x: bx,
        y: by,
        z: bz,
        overdrive: isOverdrive,
      });
      this.audio?.playSlipstreamBoost?.(isOverdrive);
      if (!this.rigAnim && !this.autopilotTarget && this.slipstreamVfx?.isActive()) {
        this.rigState.speed = Math.max(finiteOr(this.rigState.speed, 0), 10.2);
        const h = Math.atan2(
          Math.sin(finiteOr(this.rigState.heading, 0)),
          Math.cos(finiteOr(this.rigState.heading, 0))
        );
        this.rigState.vx = -Math.sin(h) * this.rigState.speed;
        this.rigState.vz = -Math.cos(h) * this.rigState.speed;
      }
      this.horizonWonder?.notifyTempleCleared({
        dropX: 8,
        dropY: this._baseHeight(8, -16) + 0.4,
        dropZ: -16,
      });

      if (this.scene) {
        const fox = this._createSpiritFoxMesh();
        fox.position.set(slot.x + 2.6, slot.y, slot.z + 1.8);
        this.scene.add(fox);
        if (this.wokenFoxes.length >= MAX_WOKEN_FOXES) {
          const oldest = this.wokenFoxes.shift();
          if (oldest?.mesh && this.scene) this.scene.remove(oldest.mesh);
        }
        this.wokenFoxes.push({ mesh: fox, baseY: slot.y, phase: this.wokenFoxes.length * 1.4 });
      }
      this.opposition?.triggerRimeBlast(slot.x, slot.z, 18.0);
      if (this.areAllEncountersCleared() && this.ghostController?.waveActive) {
        this.lastGhostWaveResult = this.ghostController.completeWave(this._boundProgressRef);
      }
    }
  }

  _spawnCrystalBurst(cx, cy, cz, count = 48) {
    if (!this.shardPool || !this.shardInstMesh) return;
    let spawned = 0;
    for (const p of this.shardPool) {
      if (p.life > 0) continue;
      p.life = 1.1 + (p.index % 5) * 0.08;
      p.x = cx + ((p.index % 7) - 3) * 0.45;
      p.y = cy + ((p.index % 5) - 2) * 0.35;
      p.z = cz + ((p.index % 3) - 1) * 0.45;
      const ang = (p.index / 12) * Math.PI * 2;
      const spd = 5.5 + (p.index % 8) * 1.25;
      p.vx = Math.cos(ang) * spd;
      p.vy = 4.5 + (p.index % 6) * 1.35;
      p.vz = Math.sin(ang) * spd;
      spawned += 1;
      if (spawned >= count) break;
    }
  }

  _spawnSnowSpray(lx, ly, lz, intensity = 1) {
    if (!this.sprayPool || !this.sprayInstMesh) return;
    for (const s of this.sprayPool) {
      if (s.life > 0) continue;
      s.life = 0.48 + (s.index % 4) * 0.06;
      s.x = lx;
      s.y = ly + 0.35;
      s.z = lz;
      const ang = (s.index / 8) * Math.PI * 2;
      s.vx = Math.cos(ang) * 3.5 * intensity;
      s.vy = 2.8 + (s.index % 4) * 1.1 * intensity;
      s.vz = Math.sin(ang) * 3.5 * intensity;
      break;
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.clock.getDelta();
    const initMs = typeof performance !== "undefined" ? performance.now() : Date.now();
    this._lastPerfMs = initMs;
    this._lastTickWallMs = initMs;
    const raf =
      typeof globalThis.requestAnimationFrame === "function"
        ? globalThis.requestAnimationFrame.bind(globalThis)
        : (cb) => setTimeout(cb, 16);

    const runFrame = () => {
      if (!this.running) return;
      const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
      this._lastTickWallMs = nowMs;
      const rawDt = Math.max(0.001, (nowMs - this._lastPerfMs) / 1000);
      this._lastPerfMs = nowMs;
      this._recordFrameSample(rawDt);

      const clockDt = this.clock.getDelta();
      const wallDt = Math.min(0.45, Math.max(1 / 120, clockDt || rawDt));
      const substeps = Math.max(1, Math.ceil(wallDt / 0.05));
      const subDt = wallDt / substeps;
      for (let i = 0; i < substeps; i++) {
        this._update(subDt);
      }
      if (this.webglAvailable && this.renderer) {
        this.renderer.render(this.scene, this.camera);
      }
    };

    const tick = () => {
      if (!this.running) return;
      runFrame();
      this._rafId = raf(tick);
    };
    this._rafId = raf(tick);

    if (typeof window !== "undefined" && !window.__E2E_3D__) {
      if (this._bgFallbackTimer) clearInterval(this._bgFallbackTimer);
      this._bgFallbackTimer = setInterval(() => {
        if (!this.running) return;
        const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
        if (nowMs - this._lastTickWallMs > 90) {
          runFrame();
        }
      }, 40);
    }
  }

  stop() {
    this.running = false;
    if (this._bgFallbackTimer) {
      clearInterval(this._bgFallbackTimer);
      this._bgFallbackTimer = null;
    }
    if (this._rafId !== null) {
      if (typeof globalThis.cancelAnimationFrame === "function") {
        globalThis.cancelAnimationFrame(this._rafId);
      } else {
        clearTimeout(this._rafId);
      }
      this._rafId = null;
    }
    this.audio?.stopHum?.();
  }

  step(dt = 1 / 60) {
    const totalDt = clampFinite(dt, 0, 10.0, 0);
    if (totalDt > 0) {
      const substeps = Math.max(1, Math.ceil(totalDt / 0.05));
      const subDt = totalDt / substeps;
      for (let i = 0; i < substeps; i++) {
        this._update(subDt);
      }
    }
    this.scene?.updateMatrixWorld?.(false);
  }

  _update(dt) {
    if (!Number.isFinite(dt) || !(dt > 0)) return;
    this._lastSimDt = dt;
    this.simElapsed += dt;
    this.elapsed = this.simElapsed;
    const elapsed = this.simElapsed;

    const spec =
      FROSTWAKE_CHASSIS_SPECS.find((c) => c.id === this.rigState.chassisId) ||
      FROSTWAKE_CHASSIS_SPECS[0];
    const hasWide = this.rigState.upgrades.includes("wide_blade");
    const hasBoost = this.rigState.upgrades.includes("ion_boosters");
    const hasHarpoon = this.rigState.upgrades.includes("titan_harpoon");

    // 1. Update Rig Motion (commit animations vs tactile driving physics)
    if (this.rigAnim) {
      this._calderaHopTimer = 0;
      this.rigAnim.t += dt;
      const p = Math.min(1, this.rigAnim.t / this.rigAnim.dur);

      if (this.rigAnim.kind === "surf_ramp" || this.rigAnim.kind === "surf_dual_system") {
        const { slot, startX, startZ, peakH } = this.rigAnim;
        const endX = slot.x - Math.sin(slot.rotY) * 15;
        const endZ = slot.z - Math.cos(slot.rotY) * 15;
        this.rigState.x = startX + (endX - startX) * p;
        this.rigState.z = startZ + (endZ - startZ) * p;
        const ground = this._baseHeight(this.rigState.x, this.rigState.z);
        const curveOffset = slot.evalTrueY ? slot.evalTrueY(p) : Math.sin(p * Math.PI) * peakH;
        this.rigState.y = ground + curveOffset;

        if (this.rigAnim.kind === "surf_dual_system" && slot.companionRig) {
          const zLocal = 2.2 - p * 17.5;
          const xLocal = 2.4 * (1 - Math.min(1, p / 0.84));
          const yLocal = slot.evalTrueY ? slot.evalTrueY(p) : 3.5;
          slot.companionRig.position.set(xLocal, yLocal + 0.35, zLocal);
          if (p >= 0.72 && slot.megaGeode && slot.megaGeode.visible) {
            slot.megaGeode.visible = false;
            this._spawnCrystalBurst(slot.x, slot.y + peakH, slot.z - 13.5, 64);
            this.audio?.playCrystalShatter?.(true);
          }
        } else if (p >= 0.52 && p <= 0.62) {
          this._spawnCrystalBurst(this.rigState.x, this.rigState.y + 1, this.rigState.z, 16);
        }
      } else if (this.rigAnim.kind === "winch_harpoon") {
        const { slot, startX, startZ, startY, summitH } = this.rigAnim;
        const targetX = slot.x - Math.sin(slot.rotY) * 3.5;
        const targetZ = slot.z - Math.cos(slot.rotY) * 3.5;
        this.rigState.x = startX + (targetX - startX) * p;
        this.rigState.z = startZ + (targetZ - startZ) * p;
        if (p <= 0.72) {
          const u = p / 0.72;
          this.rigState.y = startY + u * summitH;
        } else {
          const u = (p - 0.72) / 0.28;
          const ground = this._baseHeight(this.rigState.x, this.rigState.z) + 0.16;
          this.rigState.y = (startY + summitH) * (1 - u) + ground * u;
        }
      } else if (this.rigAnim.kind === "ram_surge") {
        this.rigState.x = this.rigAnim.startX + (this.rigAnim.endX - this.rigAnim.startX) * p;
        this.rigState.z = this.rigAnim.startZ + (this.rigAnim.endZ - this.rigAnim.startZ) * p;
        this.rigState.y = this._baseHeight(this.rigState.x, this.rigState.z) + 0.15;
      } else if (this.rigAnim.kind === "sign_pillar_jack") {
        const arch = Math.sin(Math.min(1, p) * Math.PI);
        this.rigState.y = this.rigAnim.baseY + arch * this.rigAnim.peakH;
        if (p >= 1 && this.signPillarMesh) {
          this.signPillarMesh.visible = false;
        }
      } else if (this.rigAnim.kind === "recoil_jack") {
        const lift = Math.sin(p * Math.PI) * 1.35 * this.rigAnim.deltaSign;
        this.rigState.y =
          this._baseHeight(this.rigState.x, this.rigState.z) + Math.max(0, 0.25 + lift);
      }

      if (p >= 1) {
        const finishedKind = this.rigAnim.kind;
        this.rigAnim = null;
        if (
          (finishedKind === "ram_surge" ||
            finishedKind === "surf_ramp" ||
            finishedKind === "surf_dual_system" ||
            finishedKind === "winch_harpoon") &&
          !this.autopilotTarget &&
          this.slipstreamVfx?.isActive()
        ) {
          this.rigState.speed = Math.max(finiteOr(this.rigState.speed, 0), 11.5);
          const h = Math.atan2(
            Math.sin(finiteOr(this.rigState.heading, 0)),
            Math.cos(finiteOr(this.rigState.heading, 0))
          );
          this.rigState.vx = -Math.sin(h) * this.rigState.speed;
          this.rigState.vz = -Math.cos(h) * this.rigState.speed;
        }
      }
    } else {
      let steer = this.rigState.steerInput;
      let throttle = this.rigState.throttleInput;
      let boostMul = this.rigState.boosting || this.rigState.inSurge ? 1.32 : 1.0;
      const wasAutopilot = Boolean(this.autopilotTarget);

      if (this.autopilotTarget) {
        const dx = this.autopilotTarget.x - this.rigState.x;
        const dz = this.autopilotTarget.z - this.rigState.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 2.2) {
          this.rigState.heading = this.autopilotTarget.slot.rotY;
          this.rigState.speed = 0;
          this.rigState.vx = 0;
          this.rigState.vz = 0;
          this.autopilotTarget = null;
          throttle = 0;
        } else {
          const desiredHeading = Math.atan2(-dx, -dz);
          const diff = wrapAngleDiff(desiredHeading, this.rigState.heading);
          steer = Math.max(-1, Math.min(1, -diff * 2.6));
          throttle = Math.abs(diff) > 0.9 ? 0.35 : dist > 6.5 ? 1.0 : 0.6;
          boostMul = 1.38;
        }
      }

      const permafrostFactor = this.opposition
        ? this.opposition.getPermafrostSpeedFactor(this.rigState.x, this.rigState.z, hasWide)
        : 1.0;
      this.rigState.inPermafrost = this.opposition
        ? this.opposition.isInsideIntactPermafrost(this.rigState.x, this.rigState.z)
        : false;

      const slipSpeedMul =
        wasAutopilot || !this.slipstreamVfx ? 1.0 : this.slipstreamVfx.getSpeedMultiplier();
      const maxSpd =
        spec.topSpeed * (hasBoost ? 1.28 : 1.0) * boostMul * permafrostFactor * slipSpeedMul;
      const targetSpd = throttle * maxSpd;
      const prevSpd = this.rigState.speed;
      const accel =
        permafrostFactor < 1 && Math.abs(prevSpd) > Math.abs(targetSpd)
          ? 14.0
          : Math.abs(targetSpd) > Math.abs(prevSpd)
          ? 6.8
          : 8.8;
      this.rigState.speed += (targetSpd - prevSpd) * Math.min(1, accel * dt);
      const lonAccel = (this.rigState.speed - prevSpd) / Math.max(dt, 0.001);

      if (!Number.isFinite(this.rigState.heading)) {
        this.rigState.heading = 0;
      }
      if (Math.abs(this.rigState.speed) > 0.25) {
        const dirSign = this.rigState.speed >= 0 ? 1 : -1;
        this.rigState.heading -= steer * spec.turnRate * dt * dirSign;
      }

      const fwdX = -Math.sin(this.rigState.heading);
      const fwdZ = -Math.cos(this.rigState.heading);
      const rightX = Math.cos(this.rigState.heading);
      const rightZ = -Math.sin(this.rigState.heading);

      const isAirborne = this.opposition
        ? this.opposition.updateChasmJump(dt, this.rigState, hasBoost)
        : false;

      if (!isAirborne) {
        const isSled = this.rigState.chassisId === "aurora_sled";
        const gripRate = isSled ? 4.6 : 14.0;
        const gripAlpha = Math.min(1, gripRate * dt);
        const desVx = fwdX * this.rigState.speed;
        const desVz = fwdZ * this.rigState.speed;
        this.rigState.vx += (desVx - this.rigState.vx) * gripAlpha;
        this.rigState.vz += (desVz - this.rigState.vz) * gripAlpha;

        this.rigState.x += this.rigState.vx * dt;
        this.rigState.z += this.rigState.vz * dt;
        this.rigState.lateralSlip = this.rigState.vx * rightX + this.rigState.vz * rightZ;
        this.rigState.distTraveled += Math.hypot(this.rigState.vx, this.rigState.vz) * dt;

        // Expanded radial fence r <= 68 reaches z = -60 Northern Observatory!
        const radial = Math.hypot(this.rigState.x, this.rigState.z);
        if (radial > MAX_VALLEY_RADIUS) {
          const pull = MAX_VALLEY_RADIUS / radial;
          this.rigState.x *= pull;
          this.rigState.z *= pull;
          this.rigState.speed *= 0.6;
          this.rigState.vx *= 0.6;
          this.rigState.vz *= 0.6;
        }

        const hoverBob = isSled ? Math.sin(elapsed * 4.5) * 0.12 + 0.18 : 0.14;
        const baseSurf = this._baseHeight(this.rigState.x, this.rigState.z);
        const surfY = this.opposition
          ? this.opposition.computeChasmSurfaceY(this.rigState.x, this.rigState.z, baseSurf)
          : baseSurf;
        let hopLift = 0;
        if (this._calderaHopTimer > 0) {
          this._calderaHopTimer = Math.max(0, this._calderaHopTimer - dt);
          hopLift = Math.sin((1 - this._calderaHopTimer / 0.68) * Math.PI) * 1.85;
        }
        this.rigState.y = surfY + hoverBob + hopLift;

        // Terrain-slope pitch/roll + hover-sled banking
        const eps = 0.65;
        const gradX =
          (this._baseHeight(this.rigState.x + eps, this.rigState.z) -
            this._baseHeight(this.rigState.x - eps, this.rigState.z)) /
          (2 * eps);
        const gradZ =
          (this._baseHeight(this.rigState.x, this.rigState.z + eps) -
            this._baseHeight(this.rigState.x, this.rigState.z - eps)) /
          (2 * eps);
        const slopeFwd = gradX * fwdX + gradZ * fwdZ;
        const slopeRight = gradX * rightX + gradZ * rightZ;

        const squatPitch = Math.max(-0.08, Math.min(0.08, lonAccel * 0.0045));
        const targetPitch = Math.max(-0.42, Math.min(0.42, Math.atan(slopeFwd) + squatPitch));
        const speedNorm = Math.min(1, Math.abs(this.rigState.speed) / Math.max(1, spec.topSpeed));
        const sledBank = isSled ? -steer * speedNorm * 0.34 : -steer * speedNorm * 0.06;
        const targetRoll = Math.max(-0.42, Math.min(0.42, Math.atan(slopeRight) + sledBank));

        const tiltBlend = 1 - Math.exp(-10.5 * dt);
        this.rigState.pitch += (targetPitch - this.rigState.pitch) * tiltBlend;
        this.rigState.roll += (targetRoll - this.rigState.roll) * tiltBlend;

        // Carve deformable snow + bloom Snow-Lilies + spray snow chunks!
        if (Math.abs(this.rigState.speed) > 1.1) {
          const plowX = this.rigState.x + fwdX * 1.9;
          const plowZ = this.rigState.z + fwdZ * 1.9;
          const carveRadius = spec.plowWidth * (hasWide ? 1.5 : 1.0) * 0.62;
          const newlyCarved = this._carveSnowAt(plowX, plowZ, carveRadius);

          if (newlyCarved > 0) {
            this._lilyDistAccum += Math.abs(this.rigState.speed) * dt;
            const hasBioLilies = Boolean(this.crossRealmState?.bioluminescentSnowLilies);
            const hasPrism =
              this.rigState.upgrades.includes("prismatic_trail") || this.rigState.inSurge;
            const lilyInterval = hasBioLilies ? 1.05 : hasPrism ? 1.35 : 3.2;
            if (this._lilyDistAccum >= lilyInterval) {
              this._lilyDistAccum = 0;
              const ridgeOffset = carveRadius + 0.35;
              this._spawnSnowLilyAt(
                plowX + rightX * ridgeOffset,
                surfY + 0.32,
                plowZ + rightZ * ridgeOffset,
                hasBioLilies,
                hasPrism
              );
              if (hasBioLilies || hasPrism) {
                this._spawnSnowLilyAt(
                  plowX - rightX * ridgeOffset,
                  surfY + 0.32,
                  plowZ - rightZ * ridgeOffset,
                  hasBioLilies,
                  hasPrism
                );
              }
            }
          }

          this._spawnSnowSpray(
            plowX + rightX * 1.6,
            this.rigState.y,
            plowZ + rightZ * 1.6,
            Math.min(1.4, Math.abs(this.rigState.speed) / Math.max(1, maxSpd))
          );
        }
      }

      const normSpd = Math.abs(this.rigState.speed) / Math.max(1, spec.topSpeed);
      this.audio?.updateRigHum?.(normSpd, this.rigState.chassisId);
      this.audio?.updateSnowHiss?.(normSpd, this.rigState.inPermafrost, hasWide);
    }

    // Apply Rig Transform + 6-Wheel Independent Vertical Spring Suspension
    if (this.rigGroup) {
      this.rigGroup.position.set(this.rigState.x, this.rigState.y, this.rigState.z);
      this.rigGroup.rotation.y = this.rigState.heading;
      this.rigGroup.rotation.x = this.rigState.pitch;
      this.rigGroup.rotation.z = this.rigState.roll;

      const cosH = Math.cos(this.rigState.heading);
      const sinH = Math.sin(this.rigState.heading);
      const centerBaseY = this._baseHeight(this.rigState.x, this.rigState.z);
      for (const w of this.rigWheels || []) {
        w.mesh.rotation.x -= this.rigState.speed * dt * 1.4;
        const worldWx = this.rigState.x + w.lx * cosH + w.lz * sinH;
        const worldWz = this.rigState.z - w.lx * sinH + w.lz * cosH;
        const localGroundDelta =
          this._baseHeight(worldWx, worldWz) -
          centerBaseY -
          (-w.lz * this.rigState.pitch + w.lx * this.rigState.roll);
        const treadRumble =
          Math.sin(this.rigState.distTraveled * 3.6 + w.phase) *
          0.055 *
          Math.min(1, Math.abs(this.rigState.speed) / 8);
        const targetDeflect = Math.max(-0.2, Math.min(0.24, localGroundDelta + treadRumble));
        const springAcc = 95 * (targetDeflect - w.springY) - 14 * w.springVel;
        w.springVel += springAcc * dt;
        w.springY = Math.max(-0.2, Math.min(0.24, w.springY + w.springVel * dt));
        w.mesh.position.y = w.baseY + w.springY;
      }

      if (this.companionFox) {
        this.companionFox.position.y = Math.abs(Math.sin(elapsed * 7.5)) * 0.35;
      }
      if (this.astroToadMascot) {
        this.astroToadMascot.position.y =
          (this.rigState.chassisId === "aurora_sled" ? 2.25 : 2.95) +
          Math.sin(elapsed * 3.2) * 0.1;
      }
      if (this.clockworkCrest) {
        this.clockworkCrest.rotation.y = Math.sin(elapsed * 1.6) * 0.24;
      }
      if (this.clockworkCrestOuter) {
        this.clockworkCrestOuter.rotation.z += dt * 2.4;
      }
      if (this.clockworkCrestInner) {
        this.clockworkCrestInner.rotation.z -= dt * 3.6;
      }

      const slipBoostActive = Boolean(this.slipstreamVfx?.isActive());
      const thrustDrive =
        Math.min(1.35, Math.abs(finiteOr(this.rigState.speed, 0)) / 14) +
        (this.rigState.boosting || this.rigState.inSurge || slipBoostActive ? 0.55 : 0.18);
      for (const pc of this.sledPlasmaCones || []) {
        const pulse = Math.max(0.28, thrustDrive + Math.sin(elapsed * 18 + pc.phase) * 0.16);
        pc.mesh.scale.set(0.85 + pulse * 0.18, pulse, 0.85 + pulse * 0.18);
        pc.mesh.position.z = 2.31 + 0.64 * pulse;
      }
      for (const tc of this.rigThrusterCones || []) {
        const pulse = Math.max(
          0.25,
          thrustDrive * 0.9 + Math.sin(elapsed * 20 + tc.phase) * 0.15
        );
        tc.mesh.scale.set(0.85 + pulse * 0.16, pulse, 0.85 + pulse * 0.16);
        tc.mesh.position.z = 2.51 + 0.47 * pulse;
      }
    }

    // 2. Open-Air 3D Lift Garage Pad (-24, 16) with Spatial Hysteresis
    if (this.garageHoloWrench) {
      this.garageHoloWrench.rotation.y = elapsed * 1.6;
      this.garageHoloWrench.position.y = 6.2 + Math.sin(elapsed * 2.8) * 0.28;
    }
    if (this.garagePadCooldown > 0) {
      this.garagePadCooldown = Math.max(0, this.garagePadCooldown - dt);
    }
    const dGarage = Math.hypot(this.rigState.x - -24, this.rigState.z - 16);
    if (!this.garagePadArmed && dGarage > 8.5) {
      this.garagePadArmed = true;
    }
    if (
      dGarage < 4.6 &&
      this.garagePadArmed &&
      this.garagePadCooldown <= 0 &&
      !this.encounterDockOpen &&
      !this.rigAnim
    ) {
      this.garagePadArmed = false;
      this.garagePadCooldown = 4.0;
      this.rigState.speed *= 0.25;
      this.autopilotTarget = null;
      this.audio?.playGarageLift?.();
      this.onGaragePadEntered();
    }

    // 3. Frost Guardian Colossus Idle & Awakening Animation
    if (this.guardianArms) {
      const armLift =
        this.guardianAwakeTimer > 0
          ? Math.min(2.5, (4.8 - Math.abs(this.guardianAwakeTimer - 2.4)) * 1.2)
          : Math.sin(elapsed * 1.6) * 0.22;
      this.guardianArms.forEach((arm, idx) => {
        arm.position.y = 5.4 + armLift + (idx === 1 ? 0.08 : 0);
      });
    }
    if (this.guardianAwakeTimer > 0) {
      this.guardianAwakeTimer = Math.max(0, this.guardianAwakeTimer - dt);
      if (this.guardianBeam) {
        this.guardianBeam.rotation.y = elapsed * 2.1;
        this.guardianBeamMat.opacity = Math.min(0.85, this.guardianAwakeTimer * 0.45);
        if (this.guardianAwakeTimer <= 0) {
          this.guardianBeam.visible = false;
        }
      }
    }

    // 4. Moon Sanctuary Mystery (0, 0) & Quadrant Sky-Whale Beacons (±34, ±34)
    if (
      !this.encounterDockOpen &&
      !this.activeGateSlot &&
      Math.hypot(this.rigState.x, this.rigState.z) < 4.6 &&
      Math.abs(this.rigState.speed) < 2.5
    ) {
      this.moonDwellSec += dt;
      if (this.moonDwellSec > 1.4) {
        this.onMysteryFound("moon_center");
      }
    } else {
      this.moonDwellSec = 0;
    }
    updateQuadrantWhaleBeacons(this, dt, elapsed);

    // 5. Check Proximity to 3D Encounter Gates BEFORE Opposition Step (Mandatory Math-Pause!)
    let nearest = null;
    let nearestDist = Infinity;
    for (const slot of this.gateSlots) {
      if (slot.cleared) continue;
      const appX = slot.x + Math.sin(slot.rotY) * 6.0;
      const appZ = slot.z + Math.cos(slot.rotY) * 6.0;
      const d = Math.hypot(appX - this.rigState.x, appZ - this.rigState.z);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = slot;
      }
      if (slot.targetRing) slot.targetRing.rotation.y += dt * 1.3;
      if (slot.astrolabeRings) slot.astrolabeRings.core.rotation.y += dt * 1.8;
    }

    if (nearest && nearestDist < 9.2) {
      if (this.activeGateSlot !== nearest) {
        this.activeGateSlot = nearest;
        this.opposition?.setPaused(this.isOppositionPaused());
        this.onApproachGate(nearest.encounter, nearest);
      }
    } else if (
      this.activeGateSlot &&
      (nearestDist > 12.0 || this.activeGateSlot.cleared) &&
      !this.rigAnim
    ) {
      this.activeGateSlot = null;
      this.opposition?.setPaused(this.isOppositionPaused());
      this.onLeaveGate();
    }

    // 6. Step Active Spatial Opposition, Self-Ghost Rig, Encounters, Co-Op, Slipstream Boost, Outer Biomes & Expeditions!
    const pausedForMath = this.isOppositionPaused();
    this.simTimeState = computeSimulationTimeScale({
      dt,
      encounterDockOpen: this.encounterDockOpen,
      activeGateSlot: Boolean(this.activeGateSlot),
      bulletTimeRequested: Boolean(this.bulletTimeRequested),
      realmId: "frostwake",
    });
    const plowX = this.rigState.x - Math.sin(this.rigState.heading) * 2.0;
    const plowZ = this.rigState.z - Math.cos(this.rigState.heading) * 2.0;
    if (this.opposition) {
      this.opposition.update(dt, {
        paused: pausedForMath,
        rigState: this.rigState,
        plowX,
        plowZ,
        hasWideBlade: hasWide,
        hasIonBoosters: hasBoost,
        hasTitanHarpoon: hasHarpoon,
      });
    }
    if (this.ghostController) {
      this.ghostController.update(dt, this.rigState, pausedForMath);
    }
    updateEncounterAnimations(this, dt, elapsed);
    if (this.coop) {
      this.coop.update(dt, this.rigState, Boolean(this.rigAnim));
    }

    const safePoseX = clampFinite(this.rigState.x, -VALLEY_SIZE, VALLEY_SIZE, 0);
    const safePoseY = clampFinite(this.rigState.y, -20, 80, 0);
    const safePoseZ = clampFinite(this.rigState.z, -VALLEY_SIZE, VALLEY_SIZE, 0);
    const safeHeading = Math.atan2(
      Math.sin(finiteOr(this.rigState.heading, 0)),
      Math.cos(finiteOr(this.rigState.heading, 0))
    );
    const safeSpeed = clampFinite(this.rigState.speed, -60, 60, 0);
    if (this.slipstreamVfx) {
      this.slipstreamVfx.step(dt, this.elapsed, {
        x: safePoseX,
        y: safePoseY,
        z: safePoseZ,
        heading: safeHeading,
        speed: safeSpeed,
        boosting: this.rigState.boosting,
        inSurge: this.rigState.inSurge,
        wingSpan: this.rigState.chassisId === "aurora_sled" ? 1.55 : 1.25,
      });
    }
    if (this.horizonWonder) {
      this.horizonWonder.step(
        dt,
        this.elapsed,
        { x: safePoseX, y: safePoseY, z: safePoseZ },
        (ev) => {
          this.audio?.playCoinGrab?.();
          this.onOppositionEvent?.(ev);
        }
      );
    }
    this._stepOuterFrontierBiomes(dt, elapsed, pausedForMath);
    this._stepFieldExpedition(dt, elapsed);

    // 7. Smooth Chase Camera + Slipstream Boost FOV Kick (+5.5 deg)
    if (this.camera) {
      const fwdX = -Math.sin(this.rigState.heading);
      const fwdZ = -Math.cos(this.rigState.heading);
      let desiredCamX = this.rigState.x - fwdX * 13.5;
      let desiredCamZ = this.rigState.z - fwdZ * 13.5;
      let desiredCamY = this.rigState.y + 7.2;
      let lookX = this.rigState.x + fwdX * 6.0;
      let lookY = this.rigState.y + 2.1;
      let lookZ = this.rigState.z + fwdZ * 6.0;

      if (this.activeGateSlot) {
        const s = this.activeGateSlot;
        desiredCamX =
          this.rigState.x - fwdX * 11.5 + Math.cos(this.rigState.heading) * 2.2;
        desiredCamY = this.rigState.y + 6.6;
        desiredCamZ = this.rigState.z - fwdZ * 11.5;
        lookX = (this.rigState.x + s.x) * 0.5;
        lookY = s.y + 3.6;
        lookZ = (this.rigState.z + s.z) * 0.5;
      }

      this._camTargetVec.set(desiredCamX, desiredCamY, desiredCamZ);
      this.camera.position.lerp(this._camTargetVec, Math.min(1, dt * 4.8));
      this.camera.lookAt(lookX, lookY, lookZ);

      const baseFov = this._baseCameraFov || 52;
      const targetFov =
        this.slipstreamVfx?.isActive() && !this.activeGateSlot ? baseFov + 5.5 : baseFov;
      const nextFov = this.camera.fov + (targetFov - this.camera.fov) * Math.min(1, dt * 6.5);
      if (Math.abs(nextFov - this.camera.fov) > 0.02) {
        this.camera.fov = nextFov;
        this.camera.updateProjectionMatrix();
      }
    }

    // 8. Animate Snow-Lilies, Aurora, Snowfall, Instanced Particles, Lasers, Foxes & Sky-Whale
    if (this.snowLilyMesh && this.activeLilyCount > 0) {
      let lilyDirty = false;
      for (let i = 0; i < MAX_SNOW_LILIES; i++) {
        const rec = this.snowLilies[i];
        if (!rec.active || rec.scale >= rec.targetScale) continue;
        rec.scale = Math.min(rec.targetScale, rec.scale + dt * 2.8);
        this._tmpPos.set(rec.x, rec.y, rec.z);
        this._tmpEuler.set(0, rec.rotY, 0);
        this._tmpQuat.setFromEuler(this._tmpEuler);
        this._tmpScale.setScalar(rec.scale);
        this._tmpMat4.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
        this.snowLilyMesh.setMatrixAt(i, this._tmpMat4);
        lilyDirty = true;
      }
      if (lilyDirty) this.snowLilyMesh.instanceMatrix.needsUpdate = true;
    }

    if (this.moonTotem) this.moonTotem.rotation.y = elapsed * 0.8;

    for (const r of this.auroraRibbons || []) {
      const pAttr = r.geo.attributes.position;
      for (let i = 0; i < pAttr.count; i++) {
        const x = pAttr.getX(i);
        const y = pAttr.getY(i);
        pAttr.setZ(
          i,
          Math.sin(x * 0.042 + elapsed * 0.92 + r.phase) * 4.8 +
            Math.cos(x * 0.085 - elapsed * 0.65 + y * 0.06 + r.phase) * 1.9
        );
      }
      pAttr.needsUpdate = true;
    }

    if (this.snowfall) {
      const sp = this.snowfall.geometry.attributes.position;
      for (let i = 0; i < sp.count; i++) {
        let y = sp.getY(i) - dt * 2.6;
        if (y < 0.5) y = 28;
        sp.setY(i, y);
      }
      sp.needsUpdate = true;
    }

    const stepInstPool = (pool, instMesh) => {
      if (!pool || !instMesh) return;
      let dirty = false;
      for (const p of pool) {
        if (p.life <= 0) continue;
        p.life -= dt;
        dirty = true;
        if (p.life <= 0) {
          this._tmpPos.set(0, -30, 0);
          this._tmpQuat.identity();
          this._tmpScale.set(0, 0, 0);
          this._tmpMat4.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
          instMesh.setMatrixAt(p.index, this._tmpMat4);
          continue;
        }
        p.vy -= 18 * dt;
        p.x += p.vx * dt;
        p.y = Math.max(0.2, p.y + p.vy * dt);
        p.z += p.vz * dt;
        p.rx += dt * 4;
        p.ry += dt * 5;
        this._tmpPos.set(p.x, p.y, p.z);
        this._tmpEuler.set(p.rx, p.ry, 0);
        this._tmpQuat.setFromEuler(this._tmpEuler);
        this._tmpScale.setScalar(Math.min(1, p.life * 2.2));
        this._tmpMat4.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
        instMesh.setMatrixAt(p.index, this._tmpMat4);
      }
      if (dirty) instMesh.instanceMatrix.needsUpdate = true;
    };
    stepInstPool(this.sprayPool, this.sprayInstMesh);
    stepInstPool(this.shardPool, this.shardInstMesh);

    for (let i = this.laserBeams.length - 1; i >= 0; i--) {
      const b = this.laserBeams[i];
      b.life -= dt;
      b.mesh.material.opacity = Math.max(0, b.life * 2.5);
      if (b.life <= 0) {
        if (this.scene) this.scene.remove(b.mesh);
        this.laserBeams.splice(i, 1);
      }
    }

    for (const f of this.wokenFoxes) {
      f.mesh.position.y = f.baseY + Math.abs(Math.sin(elapsed * 5 + f.phase)) * 0.55;
      f.mesh.rotation.y += dt * 1.4;
    }

    if (this.whaleTimer > 0 && this.skyWhale) {
      this.whaleTimer -= dt;
      const u = 1 - this.whaleTimer / 11.0;
      this.skyWhale.position.set(-55 + u * 110, 26 + Math.sin(u * Math.PI) * 14, -36);
      this.skyWhale.rotation.y = Math.PI / 2;
      this.skyWhale.rotation.x = -Math.cos(u * Math.PI) * 0.32;
      if (this.whaleTimer <= 0) this.skyWhale.visible = false;
    }
  }
}
