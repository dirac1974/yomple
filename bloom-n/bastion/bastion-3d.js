/**
 * Arc Bastion: Siegesmiths — 60fps Three.js Sky-Fortress & Clockwork Canyon Engine
 * Implements the full Realm3DAdapter contract with headless Node safety, 2 sculpted
 * Siege-Rovers (iron_ballista & prism_rail_skiff), all 6 ab_* upgrades + Cross-Realm trims,
 * 0.08x Crystal Bullet-Time Aura, bitwise 0.0 Mandatory Math-Pause, all 33 W0.1–W7.4
 * 3D Siege Batteries, Field Expeditions, Self-Ghost PB trails, and 2-Player Live Co-Op.
 */

import * as THREE from "../vendor/three.module.min.js";
import { BastionAudio } from "./audio.js";
import { BastionOpposition3D } from "./opposition-3d.js";
import {
  buildBastionEncounter3DGroup,
  updateBastionEncounterDialPreview,
  triggerBastionTwinBeamFX,
  applyBastionEncounterCommitFX,
  updateBastionEncounterAnimations,
} from "./encounters-3d.js";
import { BastionCoop3D, SHARED_COIN_IDS } from "./coop-3d.js";
import { GhostRoverController } from "./ghost-rover.js";
import {
  BULLET_TIME_SCALE,
  computeSimulationTimeScale,
  stepVehicleKinematics,
  resolveActiveBiome,
  createFieldExpeditionState,
  stepFieldExpedition,
  exportRobloxSimSnapshot,
} from "../core/world-sim.js";
import {
  buildCelestialSkyDome,
  buildTempleSanctuaryFrame,
  stepTempleSanctuaryFrame,
  SlipstreamBoostVFXController,
  HorizonWonderAndRelicSystem,
} from "../core/vfx-3d.js";
import {
  getCharacterToonGradient,
  getCustomSurfaceTexture,
  createLatheProfileGeometry,
  createBeveledWingGeometry,
  createSplineTubeGeometry,
  buildExplorerPilot3D,
  animateExplorerPilot3D,
  buildSpiritFox3D,
  buildSkyWhale3D,
  buildSanctuaryCreature3D,
  buildGuardianColossus3D,
} from "../core/character-graphics-3d.js";
import { RobloxFollowCameraRig } from "../core/camera-rig-3d.js";

export {
  SHARED_COIN_IDS,
  buildTempleSanctuaryFrame,
  stepTempleSanctuaryFrame,
};

export const BASTION_WORLD_RADIUS = 68;
export const GEAR_FOUNDRY_PAD_COORD = { x: -10, z: 26 };
export const MOONWELL_COORD = { x: 0, z: 0 };
export const OBSERVATORY_SPIRE_COORD = { x: 0, z: -58 };
export const CANYON_LANE_MARKERS = [-20, 0, 40];

export const CITADEL_LANDMARKS = {
  courtyard: { id: "courtyard", name: "Sky-Citadel Courtyard", x: 0, z: 14 },
  westRampart: { id: "west_rampart", name: "West Prism Rampart", x: -26, z: -10 },
  eastBastion: { id: "east_bastion", name: "East Mortar Bastion", x: 26, z: -10 },
  northOverlook: { id: "north_overlook", name: "North Ballista Overlook", x: 0, z: -30 },
  gearFoundry: { id: "gear_foundry", name: "Siegesmith Gear-Foundry Pad", x: -10, z: 26 },
  moonwell: { id: "moonwell", name: "Moonwell Sundial", x: 0, z: 0 },
  observatory: { id: "observatory", name: "Northern Household Observatory", x: 0, z: -58 },
};

export const BATTERY_ANCHORS = [
  { x: -24, z: -12, rotY: 0.36 },
  { x: 24, z: -12, rotY: -0.36 },
  { x: 0, z: -28, rotY: 0.0 },
  { x: 0, z: -14, rotY: 0.0 },
];

export const BASTION_RIG_SPECS = [
  {
    id: "iron_ballista",
    aliases: ["ballista"],
    name: "6x6 Siege-Ballista Rover",
    plowWidth: 3.2,
    topSpeed: 17.8,
    turnRate: 2.6,
    primaryHex: 0x5aa9ff,
    secondaryHex: 0x202b44,
    glowHex: 0xffd166,
  },
  {
    id: "prism_rail_skiff",
    aliases: ["rail_skiff"],
    name: "Prism Rail-Hover Skiff",
    plowWidth: 2.9,
    topSpeed: 19.4,
    turnRate: 3.1,
    primaryHex: 0x7ee8fa,
    secondaryHex: 0x1d2542,
    glowHex: 0xf7b955,
  },
];

export function normalizeBastionRigId(rawId) {
  const s = String(rawId || "").trim().toLowerCase();
  if (s === "prism_rail_skiff" || s === "rail_skiff" || s === "aurora_sled" || s === "starlight_glider") {
    return "prism_rail_skiff";
  }
  return "iron_ballista";
}

function finiteOr(val, fallback = 0) {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function clampFinite(val, min, max, fallback = 0) {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function wrapAngleDiff(target, current) {
  const a0 = Math.atan2(Math.sin(finiteOr(current, 0)), Math.cos(finiteOr(current, 0)));
  const b0 = Math.atan2(Math.sin(finiteOr(target, 0)), Math.cos(finiteOr(target, 0)));
  return Math.atan2(Math.sin(b0 - a0), Math.cos(b0 - a0));
}

function round3(n) {
  return Math.round(finiteOr(n, 0) * 1000) / 1000;
}

export class BastionWorld3D {
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
    this.audio = audio && typeof audio === "object" ? audio : new BastionAudio();
    this._onWorldActivityFn = typeof onWorldActivity === "function" ? onWorldActivity : null;
    this._onSnowClearedFn = typeof onSnowCleared === "function" ? onSnowCleared : null;
    this.onApproachGate = typeof onApproachGate === "function" ? onApproachGate : () => {};
    this.onLeaveGate = typeof onLeaveGate === "function" ? onLeaveGate : () => {};
    this.onMysteryFound = typeof onMysteryFound === "function" ? onMysteryFound : () => {};
    this.onCreatureHatched = typeof onCreatureHatched === "function" ? onCreatureHatched : () => {};
    this.onGaragePadEntered =
      typeof onGaragePadEntered === "function" ? onGaragePadEntered : () => {};
    this.onOppositionEvent =
      typeof onOppositionEvent === "function" ? onOppositionEvent : () => {};
    this.onSharedCoinGrabbed =
      typeof onSharedCoinGrabbed === "function" ? onSharedCoinGrabbed : () => {};

    this.onWorldActivity = (amount, bonusShards = 0, metricKey = "contraptionsShattered") => {
      if (this._onWorldActivityFn) {
        this._onWorldActivityFn(amount, bonusShards, metricKey);
      } else if (this._onSnowClearedFn) {
        this._onSnowClearedFn(amount, bonusShards);
      }
    };

    this.running = false;
    this.webglAvailable = false;
    this.renderer = null;
    this._rafId = null;
    this._bgFallbackTimer = null;
    this.clock = new THREE.Clock();
    this.simElapsed = 0;
    this.elapsed = 0;
    this.elapsedTime = 0;
    this._baseCameraFov = 55;

    this.encounterDockOpen = false;
    this.bulletTimeRequested = false;
    this._boundProgressRef = null;

    const rawDpr = typeof window !== "undefined" ? window.devicePixelRatio : 1;
    const initDpr = clampFinite(rawDpr, 0.85, 2.0, 1.0);
    this.dprGovernor = {
      minDpr: 0.85,
      maxDpr: 2.0,
      currentDpr: initDpr,
      emaFrameMs: 16.6,
      highLoadSec: 0,
      lowLoadSec: 0,
      cooldownSec: 0,
    };

    this.rigState = {
      x: CITADEL_LANDMARKS.courtyard.x,
      y: 0,
      z: CITADEL_LANDMARKS.courtyard.z,
      vx: 0,
      vz: 0,
      pitch: 0,
      roll: 0,
      lateralSlip: 0,
      distTraveled: 0,
      heading: 0, // 0 rad faces -Z north toward ramparts & observatory
      speed: 0,
      steerInput: 0,
      throttleInput: 0,
      boosting: false,
      rigId: "iron_ballista",
      chassisId: "iron_ballista",
      upgrades: [],
      observatoryTier: 1,
      inSurge: false,
      crossRealm: {},
      borrowedMeta: { active: false, owner: null, displayName: null },
    };

    this.crossRealmState = {};
    this.borrowedToyState = { active: false, owner: null, displayName: null };

    this.autopilotTarget = null;
    this.activeGateSlot = null;
    this._gateAutoPause = false;
    this.dialPreviewValue = 0;
    this.moonDwellSec = 0;
    this._moonMysterySent = false;

    this.garagePadArmed = true;
    this.garagePadCooldown = 0;
    this.guardianAwakeTimer = 0;
    this.guardianAwakeWorldId = null;
    this.guardianAwakeningCount = 0;
    this.whaleTimer = 0;
    this.spiritFoxTimer = 0;

    this.rigAnim = null;
    this.laserBeams = [];
    this.gateSlots = [];
    this.rigWheels = [];
    this.wheels = this.rigWheels;
    this.skiffThrusterCones = [];
    this.activePilot = null;
    this.skiffChronosCore = null;
    this.astroToadMascot = null;
    this.spiritFox = null;
    this.lastGhostWaveResult = null;

    this.lastTimeScale = computeSimulationTimeScale({
      dt: 0,
      encounterDockOpen: false,
      activeGateSlot: false,
      bulletTimeRequested: false,
      realmId: "arc_bastion",
    });

    this.expeditionState = createFieldExpeditionState("arc_bastion");

    this._camTargetVec = new THREE.Vector3();
    this._camLookVec = new THREE.Vector3();
    this.cameraRig = new RobloxFollowCameraRig({
      defaultDistance: 18.8,
      defaultPitch: 0.44,
      pivotHeight: 2.05,
    });

    this._initScene();
  }

  _baseHeight(x, z) {
    const sx = finiteOr(x, 0);
    const sz = finiteOr(z, 0);

    // Northern Observatory ridge rises proudly around z = -58
    const dObs = Math.hypot(sx, sz - OBSERVATORY_SPIRE_COORD.z);
    if (dObs < 13.5) {
      const t = 1 - dObs / 13.5;
      return 2.6 * t * t + 0.8;
    }

    // North Ballista Overlook terrace (0, -30)
    const dNorth = Math.hypot(sx, sz + 30);
    if (dNorth < 13.0) {
      return 1.35 * (1 - (dNorth / 13.0) * 0.35);
    }

    // West Prism Rampart (-26, -10) & East Mortar Bastion (26, -10)
    const dWest = Math.hypot(sx + 26, sz + 10);
    if (dWest < 12.5) {
      return 1.15 * (1 - (dWest / 12.5) * 0.3);
    }
    const dEast = Math.hypot(sx - 26, sz + 10);
    if (dEast < 12.5) {
      return 1.15 * (1 - (dEast / 12.5) * 0.3);
    }

    // Central Moonwell & Sky-Citadel Courtyard plateau
    const dCitadel = Math.hypot(sx * 0.85, (sz - 8) * 0.72);
    if (dCitadel < 22.0) {
      return 0.65;
    }

    // Lower Terraced Contraption Canyon gently stepped
    const gentleTerrace = Math.sin(sx * 0.06) * 0.22 + Math.cos(sz * 0.05) * 0.24;
    return -0.65 + gentleTerrace;
  }

  _initRenderer() {
    if (!this.canvas || typeof this.canvas.getContext !== "function") {
      this.webglAvailable = false;
      this.renderer = null;
      return;
    }
    try {
      const attrs = { antialias: true, powerPreference: "high-performance" };
      const gl =
        this.canvas.getContext("webgl2", attrs) || this.canvas.getContext("webgl", attrs);
      if (!gl) {
        this.webglAvailable = false;
        this.renderer = null;
        return;
      }
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        context: gl,
        antialias: true,
        powerPreference: "high-performance",
      });
      this.renderer.setPixelRatio(this.dprGovernor.currentDpr);
      const w = Number(this.canvas.clientWidth || this.canvas.width) || 960;
      const h = Number(this.canvas.clientHeight || this.canvas.height) || 600;
      this.renderer.setSize(w, h, false);
      this.webglAvailable = true;
    } catch (_) {
      this.webglAvailable = false;
      this.renderer = null;
    }
  }

  _initScene() {
    this._initRenderer();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c162b);
    this.scene.fog = new THREE.FogExp2(0x101d38, 0.0052);

    const w = Number(this.canvas?.clientWidth || this.canvas?.width) || 960;
    const h = Number(this.canvas?.clientHeight || this.canvas?.height) || 600;
    this.camera = new THREE.PerspectiveCamera(
      this._baseCameraFov,
      Math.max(0.2, w / Math.max(1, h)),
      0.25,
      540
    );
    this.camera.position.set(0, 11.2, 31.5);
    this.camera.lookAt(0, 1.8, 8.0);

    // Warm golden Siegesmith sun + cool sapphire sky hemisphere light
    const hemi = new THREE.HemisphereLight(0x8ec5ff, 0x261d32, 1.08);
    const sun = new THREE.DirectionalLight(0xffe6a3, 1.35);
    sun.position.set(34, 58, 28);
    const rim = new THREE.DirectionalLight(0x5ce1e6, 0.58);
    rim.position.set(-32, 26, -38);
    this.scene.add(hemi, sun, rim);

    // 1. Celestial Sky Dome ("arc_bastion") + Giant Brass Celestial Clockwork Sky-Rings
    this.skyDome = buildCelestialSkyDome({ theme: "arc_bastion", radius: 228 });
    this.scene.add(this.skyDome);
    this._buildCelestialClockworkRings();

    // 2. Sky-Bastion Terraces, Landmarks, Moonwell, Gear-Foundry Pad, Observatory & Canyon Lanes
    this._buildSkyBastionTerrainAndLandmarks();
    this._buildObservatorySpire();
    this._buildGuardianColossus();
    this._buildSkyWhale();
    this._buildSpiritFox();
    this._buildExpeditionBeacon();

    // 3. Playable 3D Siege-Rover (default iron_ballista)
    this.rigState.y = this._baseHeight(this.rigState.x, this.rigState.z) + 0.16;
    this.rebuildRig("iron_ballista", [], {}, { active: false });

    // 4. Clockwork Opposition + 0.08x Crystal Bullet-Time Dome
    this.opposition = new BastionOpposition3D({
      scene: this.scene,
      baseHeightFn: (x, z) => this._baseHeight(x, z),
      audio: this.audio,
      onWorldActivity: this.onWorldActivity,
      onOppositionEvent: (ev) => this.onOppositionEvent(ev),
    });

    // 5. Self-Ghost PB Rover Controller
    this.ghostController = new GhostRoverController(this.scene, (x, z) => this._baseHeight(x, z));

    // 6. Live 2-Player Co-Op & 4 Shared Star-Coins
    this.coop = new BastionCoop3D({
      scene: this.scene,
      baseHeightFn: (x, z) => this._baseHeight(x, z),
      spawnGearBurstFn: (x, y, z, n) => this.opposition?.spawnGearConfettiBurst(x, y, z, n),
      audio: this.audio,
      onSharedCoinGrabbed: (coinId) => this.onSharedCoinGrabbed(coinId),
    });

    // 7. Slipstream Speed-Boost VFX + Horizon Wonder & Relic System
    this.slipstreamVfx = new SlipstreamBoostVFXController({
      scene: this.scene,
      theme: "arc_bastion",
    });
    this.horizonWonder = new HorizonWonderAndRelicSystem({
      scene: this.scene,
      theme: "arc_bastion",
      monumentX: 0,
      monumentZ: -52,
    });
  }

  _buildCelestialClockworkRings() {
    const g = new THREE.Group();
    g.name = "celestial_clockwork_rings";
    g.position.set(0, 62, -68);

    const brassSkyMat = new THREE.MeshBasicMaterial({
      color: 0xf7c969,
      transparent: true,
      opacity: 0.36,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const cyanSkyMat = new THREE.MeshBasicMaterial({
      color: 0x7ee8fa,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const ringOuter = new THREE.Mesh(new THREE.TorusGeometry(48, 0.75, 10, 64), brassSkyMat);
    ringOuter.rotation.x = 0.62;
    const ringMid = new THREE.Mesh(new THREE.TorusGeometry(35, 0.55, 10, 56), cyanSkyMat);
    ringMid.rotation.y = 0.48;
    ringMid.rotation.x = -0.35;
    const ringInner = new THREE.Mesh(new THREE.TorusGeometry(22, 0.48, 8, 44), brassSkyMat);
    ringInner.rotation.x = 1.05;

    for (let t = 0; t < 16; t++) {
      const ang = (t / 16) * Math.PI * 2;
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.8, 0.8), brassSkyMat);
      tooth.position.set(Math.cos(ang) * 48, Math.sin(ang) * 48, 0);
      tooth.rotation.z = ang;
      ringOuter.add(tooth);
    }

    g.add(ringOuter, ringMid, ringInner);
    this.celestialClockworkRings = { group: g, ringOuter, ringMid, ringInner };
    this.scene.add(g);
  }

  _buildSkyBastionTerrainAndLandmarks() {
    // Terraced Clockwork Canyon & Citadel Ground Mesh
    const planeGeo = new THREE.PlaneGeometry(176, 176, 80, 80);
    planeGeo.rotateX(-Math.PI / 2);
    const pos = planeGeo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const cHigh = new THREE.Color(0x28385c);
    const cMid = new THREE.Color(0x1f2c4a);
    const cLow = new THREE.Color(0x3a2e28);
    const tmpC = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      const vy = this._baseHeight(vx, vz);
      pos.setY(i, vy);
      if (vy > 0.9) tmpC.copy(cHigh);
      else if (vy > 0.1) tmpC.copy(cMid);
      else tmpC.copy(cLow);
      colors[i * 3] = tmpC.r;
      colors[i * 3 + 1] = tmpC.g;
      colors[i * 3 + 2] = tmpC.b;
    }
    planeGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    planeGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.72,
      metalness: 0.18,
    });
    this.terrainMesh = new THREE.Mesh(planeGeo, groundMat);
    this.terrainMesh.name = "bastion_terraced_canyon_ground";
    this.scene.add(this.terrainMesh);

    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd9a441,
      emissive: 0x5c3d08,
      emissiveIntensity: 0.3,
      roughness: 0.28,
      metalness: 0.72,
    });
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x2c3e66,
      roughness: 0.54,
      metalness: 0.26,
    });
    const cyanGlowMat = new THREE.MeshStandardMaterial({
      color: 0x7ee8fa,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.95,
      roughness: 0.16,
    });
    const goldGlowMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.95,
      roughness: 0.18,
    });

    // Sculpted Bastion Platforms (Courtyard, West Prism Rampart, East Mortar Bastion, North Overlook)
    const bastionPads = [
      { name: "sky_citadel_courtyard", x: 0, z: 14, r: 11.5 },
      { name: "west_prism_rampart", x: -26, z: -10, r: 10.5 },
      { name: "east_mortar_bastion", x: 26, z: -10, r: 10.5 },
      { name: "north_ballista_overlook", x: 0, z: -30, r: 11.0 },
    ];
    for (const bp of bastionPads) {
      const grp = new THREE.Group();
      grp.name = bp.name;
      const py = this._baseHeight(bp.x, bp.z);
      grp.position.set(bp.x, py, bp.z);
      const deck = new THREE.Mesh(new THREE.CylinderGeometry(bp.r, bp.r + 0.8, 0.36, 16), stoneMat);
      deck.position.y = -0.12;
      const trim = new THREE.Mesh(new THREE.RingGeometry(bp.r - 0.45, bp.r, 32), brassMat);
      trim.rotation.x = -Math.PI / 2;
      trim.position.y = 0.07;
      grp.add(deck, trim);
      this.scene.add(grp);
    }

    // Central Moonwell Sundial at (0, 0)
    const moonwell = new THREE.Group();
    moonwell.name = "moonwell_sundial";
    const my = this._baseHeight(0, 0);
    moonwell.position.set(0, my, 0);
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 4.2, 0.38, 24), stoneMat);
    basin.position.y = 0.12;
    const pool = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.42, 24), cyanGlowMat);
    pool.position.y = 0.14;
    const gnomon = new THREE.Mesh(new THREE.ConeGeometry(0.45, 2.8, 6), brassMat);
    gnomon.position.y = 1.55;
    const moonHalo = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.08, 8, 24), goldGlowMat);
    moonHalo.position.y = 2.6;
    moonwell.add(basin, pool, gnomon, moonHalo);
    this.moonTotem = moonHalo;
    this.scene.add(moonwell);

    // Glowing Siegesmith Gear-Foundry Pad at (-10, 26)
    const foundry = new THREE.Group();
    foundry.name = "siegesmith_gear_foundry_pad";
    const fy = this._baseHeight(GEAR_FOUNDRY_PAD_COORD.x, GEAR_FOUNDRY_PAD_COORD.z);
    foundry.position.set(GEAR_FOUNDRY_PAD_COORD.x, fy, GEAR_FOUNDRY_PAD_COORD.z);
    const padBase = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 4.0, 0.32, 16), brassMat);
    padBase.position.y = 0.12;
    const padRing = new THREE.Mesh(new THREE.RingGeometry(2.8, 3.45, 28), goldGlowMat);
    padRing.rotation.x = -Math.PI / 2;
    padRing.position.y = 0.3;
    const holoCog = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.18, 8, 14), cyanGlowMat);
    holoCog.position.y = 3.8;
    foundry.add(padBase, padRing, holoCog);
    this.foundryHoloCog = holoCog;
    this.scene.add(foundry);

    // Lower Terraced Contraption Canyon Lanes marked -20, 0, +40
    this.canyonLaneGroups = [];
    for (const coordVal of CANYON_LANE_MARKERS) {
      const label = coordVal > 0 ? `+${coordVal}` : String(coordVal);
      const laneGrp = new THREE.Group();
      laneGrp.name = `canyon_lane_${label}`;
      const worldX = clampFinite(coordVal * 0.85, -36, 36, 0);
      const ly = this._baseHeight(worldX, -22);
      laneGrp.position.set(worldX, ly, -22);
      laneGrp.userData = { coordinateMarker: coordVal, label };

      const rail = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 26.0), brassMat);
      rail.position.y = 0.08;
      const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 2.4, 8), stoneMat);
      pylon.position.set(0, 1.2, -11.5);
      const beacon = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.48, 0),
        coordVal < 0 ? cyanGlowMat : coordVal === 0 ? goldGlowMat : brassMat
      );
      beacon.position.set(0, 2.75, -11.5);
      laneGrp.add(rail, pylon, beacon);
      this.scene.add(laneGrp);
      this.canyonLaneGroups.push(laneGrp);
    }
  }

  _buildObservatorySpire() {
    const g = new THREE.Group();
    g.name = "northern_observatory_spire";
    const oy = this._baseHeight(OBSERVATORY_SPIRE_COORD.x, OBSERVATORY_SPIRE_COORD.z);
    g.position.set(OBSERVATORY_SPIRE_COORD.x, oy, OBSERVATORY_SPIRE_COORD.z);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x243456, roughness: 0.48 });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd9a441,
      emissive: 0x5c3d08,
      emissiveIntensity: 0.38,
      roughness: 0.24,
      metalness: 0.76,
    });
    const starMat = new THREE.MeshStandardMaterial({
      color: 0x7ee8fa,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.1,
    });

    this.observatoryTierMeshes = [];
    for (let t = 0; t < 5; t++) {
      const tierGrp = new THREE.Group();
      tierGrp.name = `observatory_tier_${t + 1}`;
      const r = 4.4 - t * 0.58;
      const h = 2.6;
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.88, r, h, 14), stoneMat);
      drum.position.y = t * 2.45 + h * 0.5;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.92, 0.12, 8, 24), brassMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = t * 2.45 + h;
      tierGrp.add(drum, ring);
      if (t === 4) {
        const crownStar = new THREE.Mesh(new THREE.OctahedronGeometry(1.35, 0), starMat);
        crownStar.position.y = t * 2.45 + h + 1.8;
        tierGrp.add(crownStar);
      }
      g.add(tierGrp);
      this.observatoryTierMeshes.push(tierGrp);
    }

    this.observatoryGroup = g;
    this.scene.add(g);
    this.setObservatoryTier(1);
  }

  _buildGuardianColossus() {
    const g = new THREE.Group();
    g.name = "citadel_clockwork_guardian";
    const gy = this._baseHeight(0, -44);
    g.position.set(0, gy, -44);

    const sculptedKnight = buildGuardianColossus3D({ realm: "arc_bastion" });
    sculptedKnight.scale.setScalar(1.18);
    const halo =
      sculptedKnight.userData?.halo ||
      sculptedKnight.getObjectByName("guardian_astrolabe_halo") ||
      null;

    this.guardianBeamMat = new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.guardianBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 2.2, 34, 16, 1, true),
      this.guardianBeamMat
    );
    this.guardianBeam.position.y = 17;
    this.guardianBeam.visible = false;

    g.add(sculptedKnight, this.guardianBeam);
    this.guardianGroup = g;
    this.guardianSculpture = sculptedKnight;
    this.guardianHalo = halo;
    this.scene.add(g);
  }

  _buildSkyWhale() {
    const g = new THREE.Group();
    g.name = "bastion_starlight_whale";
    const whaleMesh = buildSkyWhale3D({ theme: "arc_bastion", scale: 1.35 });
    g.add(whaleMesh);
    g.visible = false;
    this.skyWhale = g;
    this.skyWhaleFins = whaleMesh.userData?.fins || null;
    this.scene.add(g);
  }

  _buildSpiritFox() {
    const fox = buildSpiritFox3D({ scale: 1.08 });
    fox.visible = false;
    this.spiritFox = fox;
    this.spiritFoxTimer = 0;
    this.scene.add(fox);
  }

  _triggerSpiritFoxReveal(slot = null) {
    if (!this.spiritFox) return;
    const fx = (slot ? slot.x : this.rigState.x) + 2.75;
    const fz = (slot ? slot.z : this.rigState.z) + 2.4;
    const fy = this._baseHeight(fx, fz);
    this.spiritFox.position.set(fx, fy, fz);
    this.spiritFox.rotation.y = slot ? slot.rotY : this.rigState.heading;
    this.spiritFox.visible = true;
    this.spiritFoxTimer = 4.4;
  }

  _buildExpeditionBeacon() {
    const g = new THREE.Group();
    g.name = "bastion_expedition_waypoint_beacon";
    const goldMat = new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const cyanMat = new THREE.MeshBasicMaterial({
      color: 0x7ee8fa,
      transparent: true,
      opacity: 0.85,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.9, 2.45, 28), goldMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.12;
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.48, 9.5, 12, 1, true), goldMat);
    pillar.position.y = 4.75;
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.62, 0), cyanMat);
    crystal.position.y = 2.4;
    g.add(ring, pillar, crystal);
    this.expeditionBeaconGroup = g;
    this.expeditionCrystal = crystal;
    this.scene.add(g);
    this._syncExpeditionBeacon();
  }

  _syncExpeditionBeacon() {
    if (!this.expeditionBeaconGroup) return;
    const wp = Array.isArray(this.expeditionState?.waypoints)
      ? this.expeditionState.waypoints.find((w) => !w.collected) || null
      : null;
    if (!wp) {
      this.expeditionBeaconGroup.visible = false;
      return;
    }
    const y = this._baseHeight(wp.x, wp.z);
    this.expeditionBeaconGroup.position.set(wp.x, y, wp.z);
    this.expeditionBeaconGroup.visible = !this.isOppositionPaused() && !this.autopilotTarget;
  }

  setObservatoryTier(tier = 1) {
    const clamped = Math.max(1, Math.min(6, Math.round(finiteOr(tier, 1))));
    this.rigState.observatoryTier = clamped;
    if (Array.isArray(this.observatoryTierMeshes)) {
      this.observatoryTierMeshes.forEach((m, idx) => {
        const unlocked = idx < Math.min(5, clamped);
        m.visible = unlocked;
        const bonusScale = clamped >= 6 ? 1.12 : 1.0;
        m.scale.setScalar(bonusScale);
      });
    }
    if (this.observatoryGroup) {
      const overall = 0.86 + clamped * 0.08;
      this.observatoryGroup.scale.setScalar(overall);
    }
  }

  setSurgeMode(inSurge) {
    this.rigState.inSurge = Boolean(inSurge);
  }

  setEncounterDockOpen(isOpen) {
    this.encounterDockOpen = Boolean(isOpen);
    this._refreshTimeScaleState(0);
    if (this.opposition) {
      this.opposition.setPaused(this.isOppositionPaused());
    }
    this._syncExpeditionBeacon();
  }

  isOppositionPaused() {
    return this.encounterDockOpen === true || this.activeGateSlot !== null;
  }

  dismissActiveEncounter() {
    if (this.activeGateSlot) {
      this.activeGateSlot._dismissedUntilLeave = true;
      this.activeGateSlot = null;
    }
    this.encounterDockOpen = false;
    this._gateAutoPause = false;
    this.autopilotTarget = null;
    this._refreshTimeScaleState(0);
    if (this.opposition) {
      this.opposition.setPaused(this.isOppositionPaused());
    }
    this._syncExpeditionBeacon();
  }

  orbitCamera(deltaYaw = 0, deltaPitch = 0) {
    return this.cameraRig?.orbitBy(deltaYaw, deltaPitch);
  }

  zoomCamera(deltaDistance = 0) {
    return this.cameraRig?.zoomBy(deltaDistance);
  }

  zoomCameraScale(scaleFactor = 1) {
    return this.cameraRig?.zoomScale(scaleFactor);
  }

  resetCamera(opts = {}) {
    return this.cameraRig?.resetBehindRig(opts);
  }

  getCameraState() {
    return this.cameraRig?.getState() || null;
  }

  setBulletTimeRequested(flag) {
    const next = Boolean(flag);
    if (next !== this.bulletTimeRequested) {
      this.bulletTimeRequested = next;
      this.audio?.playBulletTimeChime?.(next || this.isOppositionPaused());
    }
    this._refreshTimeScaleState(0);
    return this.getBulletTimeState();
  }

  toggleBulletTime() {
    return this.setBulletTimeRequested(!this.bulletTimeRequested);
  }

  isBulletTimeActive() {
    return Boolean(this.bulletTimeRequested || this.isOppositionPaused());
  }

  getBulletTimeState() {
    const active = this.isBulletTimeActive();
    const mathPaused = this.isOppositionPaused();
    return {
      active,
      requested: Boolean(this.bulletTimeRequested),
      mathPaused,
      scaleFactor: mathPaused ? 0.0 : active ? BULLET_TIME_SCALE : 1.0,
    };
  }

  _refreshTimeScaleState(dt = 0) {
    this.lastTimeScale = computeSimulationTimeScale({
      dt,
      encounterDockOpen: this.encounterDockOpen,
      activeGateSlot: Boolean(this.activeGateSlot),
      bulletTimeRequested: this.bulletTimeRequested,
      realmId: "arc_bastion",
    });
    return this.lastTimeScale;
  }

  getActiveBiome() {
    return resolveActiveBiome("arc_bastion", this.rigState.x, this.rigState.z);
  }

  getFieldExpeditionState() {
    const st = this.expeditionState;
    if (!st) return null;
    const nextWp = Array.isArray(st.waypoints)
      ? st.waypoints.find((w) => !w.collected) || null
      : null;
    return {
      realmId: st.realmId,
      expeditionId: st.expeditionId,
      activeExpeditionId: st.expeditionId,
      title: st.title,
      promptShort: st.promptShort,
      icon: st.icon,
      shardReward: st.shardReward,
      collectedCount: st.collectedCount,
      waypointIndex: st.collectedCount,
      targetCount: st.targetCount,
      totalWaypoints: st.targetCount,
      currentWaypoint: nextWp ? { ...nextWp } : null,
      waypoints: Array.isArray(st.waypoints) ? st.waypoints.map((w) => ({ ...w })) : [],
      completedTotal: st.completedTotal,
      completedCount: st.completedTotal,
    };
  }

  getRobloxSimSnapshot() {
    this._refreshTimeScaleState(1 / 60);
    const snap = exportRobloxSimSnapshot({
      realmId: "arc_bastion",
      vehicleState: {
        ...this.rigState,
        chassisId: this.rigState.rigId,
      },
      timeScaleState: this.lastTimeScale,
      expeditionState: this.expeditionState,
    });
    snap.opposition = this.opposition ? this.opposition.getSnapshots() : [];
    return snap;
  }

  applyLoadout(progress = {}, crossRealmUnlocks = {}, borrowedToy = null) {
    this._boundProgressRef = progress && typeof progress === "object" ? progress : null;
    const abGame = progress?.games?.arc_bastion || {};
    if (this.expeditionState && Number.isFinite(Number(abGame.expeditionsCompleted))) {
      this.expeditionState.completedTotal = Math.max(
        this.expeditionState.completedTotal || 0,
        Math.max(0, Math.round(Number(abGame.expeditionsCompleted)))
      );
    }
    const baseRig = normalizeBastionRigId(
      abGame.equippedRig || abGame.equippedChassis || progress?.equippedBastionRig || "iron_ballista"
    );
    const baseUpgrades = [
      ...(Array.isArray(abGame.bastionUpgrades) ? abGame.bastionUpgrades : []),
      ...(Array.isArray(progress?.ownedUpgrades)
        ? progress.ownedUpgrades.filter((u) => String(u).startsWith("ab_"))
        : []),
    ];

    const borrowedAb =
      borrowedToy?.bastionRig ||
      (borrowedToy && (borrowedToy.rigId || borrowedToy.equippedRig || borrowedToy.chassisId)
        ? {
            rigId: borrowedToy.rigId || borrowedToy.equippedRig || borrowedToy.chassisId,
            upgrades: Array.isArray(borrowedToy.bastionUpgrades)
              ? borrowedToy.bastionUpgrades
              : Array.isArray(borrowedToy.upgrades)
              ? borrowedToy.upgrades
              : [],
          }
        : null);

    const effectiveRig = borrowedAb?.rigId ? normalizeBastionRigId(borrowedAb.rigId) : baseRig;
    const effectiveUpgrades = Array.from(
      new Set([...baseUpgrades, ...(Array.isArray(borrowedAb?.upgrades) ? borrowedAb.upgrades : [])])
    );

    const cru = crossRealmUnlocks && typeof crossRealmUnlocks === "object" ? crossRealmUnlocks : {};
    const oddCreatures = Array.isArray(progress?.games?.oddroot?.hatchedCreatures)
      ? progress.games.oddroot.hatchedCreatures
      : [];
    const discoveredMysteries = Array.isArray(progress?.discoveredMysteries)
      ? progress.discoveredMysteries
      : [];

    const resolvedCrossRealm = {
      cryoCannonUnlocked: Boolean(
        cru.cryoCannonUnlocked ||
          cru.cryoBuoyancyTrim ||
          oddCreatures.includes("zero_g_toad") ||
          oddCreatures.includes("astro_toad") ||
          (progress?.records?.deepestSubZero ?? 0) <= -40 ||
          (progress?.records?.deepestSubZero ?? 0) >= 100 ||
          (progress?.nodes?.["W1.2"]?.stage || 0) >= 2
      ),
      astroToadUnlocked: Boolean(
        cru.astroToadUnlocked ||
          cru.astroToadCabMascot ||
          cru.cryoToadMascot ||
          cru.cryoCannonUnlocked ||
          cru.cryoBuoyancyTrim ||
          oddCreatures.includes("zero_g_toad") ||
          oddCreatures.includes("astro_toad") ||
          (progress?.records?.deepestSubZero ?? 0) <= -40 ||
          (progress?.records?.deepestSubZero ?? 0) >= 100 ||
          (progress?.nodes?.["W1.2"]?.stage || 0) >= 2
      ),
      bastionMosaicTrim: Boolean(
        cru.bastionMosaicTrim ||
          cru.goldenMosaicTrim ||
          cru.goldenMosaicPlowTrim ||
          progress?.games?.oddroot?.mosaicForged ||
          (progress?.nodes?.["W6.3"]?.stage || 0) >= 2
      ),
      silverMoonLantern: Boolean(
        cru.silverMoonLantern || discoveredMysteries.includes("moon_center")
      ),
    };

    const borrowedMeta = borrowedAb
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

    if (Number.isFinite(Number(progress?.observatoryTier))) {
      this.setObservatoryTier(Number(progress.observatoryTier));
    }

    this.rebuildRig(effectiveRig, effectiveUpgrades, resolvedCrossRealm, borrowedMeta);
    if (this.ghostController) {
      this.ghostController.loadFromProgress(progress);
      this.ghostController.setRigAppearance(effectiveRig);
    }
  }

  setRigMode(rigId) {
    const clean = normalizeBastionRigId(rigId);
    this.rebuildRig(clean, this.rigState.upgrades, this.crossRealmState, this.borrowedToyState);
    this.ghostController?.setRigAppearance(clean);
    return clean;
  }

  toggleRigMode() {
    const next =
      this.rigState.rigId === "iron_ballista" ? "prism_rail_skiff" : "iron_ballista";
    return this.setRigMode(next);
  }

  toggleMount() {
    return this.toggleRigMode();
  }

  rebuildRig(
    rigId = "iron_ballista",
    upgrades = [],
    crossRealm = this.crossRealmState || {},
    borrowedMeta = this.borrowedToyState || { active: false }
  ) {
    const cleanRig = normalizeBastionRigId(rigId);
    const cleanUpgrades = Array.isArray(upgrades) ? Array.from(new Set(upgrades)) : [];

    this.rigState.rigId = cleanRig;
    this.rigState.chassisId = cleanRig;
    this.rigState.upgrades = cleanUpgrades;
    this.crossRealmState = crossRealm || {};
    this.borrowedToyState = borrowedMeta || { active: false };
    this.opposition?.setUpgrades(cleanUpgrades);

    if (!this.scene) return;
    if (this.rigGroup) {
      this.scene.remove(this.rigGroup);
    }

    const spec =
      BASTION_RIG_SPECS.find((r) => r.id === cleanRig) || BASTION_RIG_SPECS[0];
    const upSet = new Set(cleanUpgrades);
    const hasCrown = upSet.has("ab_citadel_crown");

    const g = new THREE.Group();
    g.name = `bastion_rover_${cleanRig}`;
    g.rotation.order = "YXZ";
    this.rigWheels = [];
    this.wheels = this.rigWheels;
    this.skiffThrusterCones = [];
    this.frontGearRam = null;
    this.ballistaTurret = null;
    this.chronosHarpStrings = null;
    this.activePilot = null;
    this.skiffChronosCore = null;
    this.astroToadMascot = null;

    const gradMap = getCharacterToonGradient();
    const sapphireTex = getCustomSurfaceTexture("sapphire_filigree");
    const brassTex = getCustomSurfaceTexture("bastion_brass_plate");

    const sapphireHullMat = new THREE.MeshStandardMaterial({
      map: sapphireTex,
      color: hasCrown ? 0xffe484 : 0x8ec5ff,
      roughness: 0.26,
      metalness: 0.42,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      map: brassTex,
      color: 0xfbbf24,
      emissive: 0x5c3d08,
      emissiveIntensity: 0.3,
      roughness: 0.24,
      metalness: 0.74,
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: spec.secondaryHex,
      roughness: 0.46,
      metalness: 0.42,
    });
    const leatherMat = new THREE.MeshToonMaterial({
      color: 0x5c3a24,
      gradientMap: gradMap,
    });
    const amberGlowMat = new THREE.MeshStandardMaterial({
      color: spec.glowHex,
      emissive: spec.glowHex,
      emissiveIntensity: 1.05,
      roughness: 0.16,
    });
    const cyanCrystalMat = new THREE.MeshStandardMaterial({
      color: 0x7ee8fa,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.08,
      roughness: 0.12,
    });
    const holoSlateMat = new THREE.MeshStandardMaterial({
      color: 0x67e8f9,
      emissive: 0x22d3ee,
      emissiveIntensity: 0.95,
      transparent: true,
      opacity: 0.58,
      roughness: 0.1,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    if (cleanRig === "prism_rail_skiff") {
      // Chrono-Tactician Twin-Prong Hover-Skiff: contoured fuselage, swept forward prongs,
      // central Hourglass Chronos Core, lathed turbine nacelles, curved cockpit & HUD slate!
      const fuselage = new THREE.Mesh(
        createLatheProfileGeometry(
          [
            [0.48, -1.16],
            [0.64, -0.78],
            [0.74, -0.15],
            [0.72, 0.58],
            [0.58, 1.32],
            [0.34, 1.88],
            [0.08, 2.12],
          ],
          22
        ),
        sapphireHullMat
      );
      fuselage.rotation.x = Math.PI / 2;
      fuselage.scale.set(1.06, 0.84, 1.0);
      fuselage.position.set(0, 0.96, 0.12);
      g.add(fuselage);

      // Central Nose Hourglass Chronos Core (two opposing crystal cones + burnished brass bezel)
      const chronosNose = new THREE.Group();
      chronosNose.name = "skiff_hourglass_chronos_core";
      chronosNose.position.set(0, 0.96, -1.08);

      const noseBezel = new THREE.Mesh(
        new THREE.TorusGeometry(0.46, 0.082, 12, 26),
        brassMat
      );
      const chamberBack = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.42, 0.12, 20),
        darkMat
      );
      chamberBack.rotation.x = Math.PI / 2;
      chamberBack.position.z = 0.05;

      const hourglassSpinner = new THREE.Group();
      const upperCrystalCone = new THREE.Mesh(
        new THREE.ConeGeometry(0.19, 0.3, 14),
        cyanCrystalMat
      );
      upperCrystalCone.rotation.z = Math.PI;
      upperCrystalCone.position.y = 0.15;
      const lowerCrystalCone = new THREE.Mesh(
        new THREE.ConeGeometry(0.19, 0.3, 14),
        cyanCrystalMat
      );
      lowerCrystalCone.position.y = -0.15;
      const sandOrb = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.085, 0),
        amberGlowMat
      );
      const capTop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.21, 0.21, 0.045, 16),
        brassMat
      );
      capTop.position.y = 0.31;
      const capBot = capTop.clone();
      capBot.position.y = -0.31;
      const swirlRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.32, 0.026, 8, 22),
        amberGlowMat
      );
      swirlRing.rotation.y = 0.42;
      hourglassSpinner.add(
        upperCrystalCone,
        lowerCrystalCone,
        sandOrb,
        capTop,
        capBot,
        swirlRing
      );
      chronosNose.add(noseBezel, chamberBack, hourglassSpinner);
      this.skiffChronosCore = hourglassSpinner;
      g.add(chronosNose);

      // Left & Right Swept Forward Prongs + Glowing Cyan Rail Channels
      const twinPrisms = new THREE.Group();
      twinPrisms.name = "skiff_twin_rail_prisms";
      const prongGeo = createBeveledWingGeometry(
        [
          [0.36, 0.22],
          [0.54, -2.42],
          [0.72, -2.52],
          [0.98, -1.62],
          [0.94, 0.36],
        ],
        0.22,
        0.045
      );
      const prongTrimGeo = createBeveledWingGeometry(
        [
          [0.52, -2.44],
          [0.74, -2.56],
          [0.92, -1.85],
          [0.68, -1.78],
        ],
        0.25,
        0.03
      );

      for (const side of [-1, 1]) {
        const prongSideGrp = new THREE.Group();
        prongSideGrp.scale.x = side;

        const prongHull = new THREE.Mesh(prongGeo, sapphireHullMat);
        prongHull.rotation.x = Math.PI / 2;
        prongHull.position.set(0, 1.02, 0);

        const prongBrassTip = new THREE.Mesh(prongTrimGeo, brassMat);
        prongBrassTip.rotation.x = Math.PI / 2;
        prongBrassTip.position.set(0, 1.04, 0);

        const railChannel = new THREE.Mesh(
          createBeveledWingGeometry(
            [
              [0.43, -0.25],
              [0.56, -2.25],
              [0.64, -2.2],
              [0.52, -0.2],
            ],
            0.12,
            0.018
          ),
          cyanCrystalMat
        );
        railChannel.rotation.x = Math.PI / 2;
        railChannel.position.set(0, 0.99, 0);

        prongSideGrp.add(prongHull, prongBrassTip, railChannel);
        twinPrisms.add(prongSideGrp);
      }
      g.add(twinPrisms);

      // Side Lathed Hover-Turbine Nacelles with Glowing Cyan Intake & Exhaust Rings
      const nacelleBodyGeo = createLatheProfileGeometry(
        [
          [0.22, -0.76],
          [0.31, -0.48],
          [0.33, 0.14],
          [0.28, 0.68],
          [0.2, 0.88],
        ],
        18
      );
      const pylonGeo = createBeveledWingGeometry(
        [
          [0.62, 0.15],
          [1.36, 0.35],
          [1.36, 0.98],
          [0.58, 0.92],
        ],
        0.1,
        0.025
      );

      for (const side of [-1, 1]) {
        const pylon = new THREE.Mesh(pylonGeo, brassMat);
        pylon.rotation.x = Math.PI / 2;
        pylon.scale.x = side;
        pylon.position.set(0, 0.95, 0);
        g.add(pylon);

        const nacelle = new THREE.Group();
        nacelle.position.set(side * 1.44, 0.88, 0.68);

        const barrel = new THREE.Mesh(nacelleBodyGeo, sapphireHullMat);
        barrel.rotation.x = Math.PI / 2;

        const intakeCowl = new THREE.Mesh(
          new THREE.TorusGeometry(0.24, 0.048, 10, 20),
          brassMat
        );
        intakeCowl.position.z = -0.76;

        const intakeGlow = new THREE.Mesh(
          new THREE.CylinderGeometry(0.19, 0.19, 0.08, 16),
          cyanCrystalMat
        );
        intakeGlow.rotation.x = Math.PI / 2;
        intakeGlow.position.z = -0.75;

        const aftBrassBand = new THREE.Mesh(
          new THREE.TorusGeometry(0.23, 0.04, 10, 20),
          brassMat
        );
        aftBrassBand.position.z = 0.78;

        const exhaustRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.18, 0.03, 8, 18),
          cyanCrystalMat
        );
        exhaustRing.position.z = 0.89;

        nacelle.add(barrel, intakeCowl, intakeGlow, aftBrassBand, exhaustRing);
        g.add(nacelle);

        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(0.2, 1.05, 12, 1, true),
          cyanCrystalMat
        );
        cone.rotation.x = Math.PI / 2;
        cone.position.set(side * 1.44, 0.88, 2.05);
        g.add(cone);
        this.skiffThrusterCones.push({ mesh: cone, phase: side > 0 ? 0 : 1.5 });
      }

      // Open Curved Cockpit Backrest, Swept Tail Fin, Seated Chrono-Tactician Pilot & Holo HUD Slate
      const backrest = new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.44,
          0.48,
          0.86,
          16,
          1,
          true,
          -Math.PI * 0.42,
          Math.PI * 0.84
        ),
        leatherMat
      );
      backrest.position.set(0, 1.28, 0.56);
      const cockpitRim = new THREE.Mesh(
        new THREE.TorusGeometry(0.56, 0.055, 10, 24),
        brassMat
      );
      cockpitRim.rotation.x = Math.PI / 2 - 0.24;
      cockpitRim.position.set(0, 1.26, 0.34);

      const tailFin = new THREE.Mesh(
        createBeveledWingGeometry(
          [
            [0, 0],
            [0.58, 0.46],
            [0.72, 0.12],
            [0.25, -0.18],
          ],
          0.06,
          0.02
        ),
        brassMat
      );
      tailFin.rotation.y = Math.PI / 2;
      tailFin.position.set(0.03, 1.28, 1.42);
      g.add(backrest, cockpitRim, tailFin);

      const pilot = buildExplorerPilot3D({
        role: "chrono_tactician",
        seated: true,
        scale: 0.78,
      });
      pilot.position.set(0, 0.82, 0.42);
      g.add(pilot);
      this.activePilot = pilot;

      const hudGroup = new THREE.Group();
      hudGroup.name = "skiff_holo_hud_slate";
      hudGroup.position.set(0, 1.34, -0.14);
      hudGroup.rotation.x = -0.45;
      const hudPane = new THREE.Mesh(
        createBeveledWingGeometry(
          [
            [-0.38, -0.2],
            [0.38, -0.2],
            [0.33, 0.22],
            [-0.33, 0.22],
          ],
          0.014,
          0.006
        ),
        holoSlateMat
      );
      const hudReticle = new THREE.Mesh(
        new THREE.TorusGeometry(0.1, 0.014, 8, 18),
        amberGlowMat
      );
      hudReticle.position.z = 0.02;
      hudGroup.add(hudPane, hudReticle);
      g.add(hudGroup);
    } else {
      // 6x6 Siegesmith Ballista Crawler: contoured royal-sapphire & riveted-brass hull,
      // 6 spoked wheels, front brass gear-medallion, curved exhausts, torsion Ballista & goggled pilot!
      const hullFlankShape = [
        [-1.62, 0.0],
        [1.56, 0.0],
        [1.72, 0.56],
        [0.42, 0.62],
        [0.32, 0.94],
        [-1.48, 0.94],
        [-1.72, 0.48],
      ];
      const hullBody = new THREE.Mesh(
        createBeveledWingGeometry(hullFlankShape, 1.96, 0.08),
        sapphireHullMat
      );
      hullBody.rotation.y = -Math.PI / 2;
      hullBody.position.set(0.98, 0.68, 0.12);
      g.add(hullBody);

      // Beveled Brass Deck Rails & Side Clockwork Cogs
      for (const sx of [-1, 1]) {
        const railTrim = new THREE.Mesh(
          createSplineTubeGeometry(
            [
              [sx * 1.06, 1.32, -1.56],
              [sx * 1.08, 1.34, 0.28],
              [sx * 1.04, 1.66, 0.52],
              [sx * 1.02, 1.66, 1.64],
            ],
            0.055,
            16,
            8
          ),
          brassMat
        );
        g.add(railTrim);

        // Exposed side clockwork gears
        const sideCog = new THREE.Mesh(
          new THREE.TorusGeometry(0.24, 0.048, 8, 14),
          brassMat
        );
        sideCog.rotation.y = Math.PI / 2;
        sideCog.position.set(sx * 1.07, 1.04, -0.52);
        const headlamp = new THREE.Mesh(
          new THREE.SphereGeometry(0.13, 12, 10),
          amberGlowMat
        );
        headlamp.position.set(sx * 0.86, 1.22, -1.62);
        const lampHood = new THREE.Mesh(
          new THREE.TorusGeometry(0.14, 0.032, 8, 14),
          brassMat
        );
        lampHood.position.set(sx * 0.86, 1.22, -1.6);
        g.add(sideCog, headlamp, lampHood);

        // Rear curved brass exhaust pipes with glowing crystal-steam wisps
        const exhaustPipe = new THREE.Mesh(
          createSplineTubeGeometry(
            [
              [sx * 0.78, 1.15, 1.48],
              [sx * 0.92, 1.58, 1.78],
              [sx * 0.98, 2.08, 1.92],
            ],
            0.075,
            14,
            10
          ),
          brassMat
        );
        const steamPuff = new THREE.Mesh(
          new THREE.SphereGeometry(0.11, 10, 8),
          cyanCrystalMat
        );
        steamPuff.scale.set(0.9, 1.35, 0.9);
        steamPuff.position.set(sx * 1.0, 2.24, 1.96);
        g.add(exhaustPipe, steamPuff);
      }

      // Glowing Amber Reactor Core & Front Spinning Brass Gear-Medallion Ram
      const amberCore = new THREE.Mesh(
        new THREE.SphereGeometry(0.32, 16, 12),
        amberGlowMat
      );
      amberCore.name = "ballista_amber_reactor_core";
      amberCore.scale.set(1.0, 1.0, 0.65);
      amberCore.position.set(0, 1.04, -1.68);
      g.add(amberCore);

      const gearRam = new THREE.Group();
      gearRam.name = "ballista_front_gear_ram";
      gearRam.position.set(0, 0.98, -1.72);
      const medallionRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.46, 0.095, 10, 18),
        brassMat
      );
      gearRam.add(medallionRing);
      for (let t = 0; t < 10; t++) {
        const ang = (t / 10) * Math.PI * 2;
        const tooth = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.055, 0.1, 4, 8),
          brassMat
        );
        tooth.position.set(Math.cos(ang) * 0.56, Math.sin(ang) * 0.56, 0);
        tooth.rotation.z = ang;
        gearRam.add(tooth);
      }
      const lowerAxle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 1.96, 10),
        brassMat
      );
      lowerAxle.rotation.z = Math.PI / 2;
      lowerAxle.position.set(0, -0.34, -0.05);
      gearRam.add(lowerAxle);
      this.frontGearRam = gearRam;
      g.add(gearRam);

      // Sculpted Twin-Arm Curved Torsion Ballista Bow + Faceted Glowing Cyan Crystal Bolt
      const turret = new THREE.Group();
      turret.name = "ballista_rotating_turret";
      turret.position.set(0, 1.38, -0.46);

      const pedestal = new THREE.Mesh(
        createLatheProfileGeometry(
          [
            [0.68, 0.0],
            [0.62, 0.16],
            [0.42, 0.36],
            [0.36, 0.46],
          ],
          16
        ),
        brassMat
      );
      const stockRail = new THREE.Mesh(
        createSplineTubeGeometry(
          [
            [0, 0.48, 0.55],
            [0, 0.52, -0.25],
            [0, 0.54, -1.05],
          ],
          0.095,
          12,
          8
        ),
        leatherMat
      );
      turret.add(pedestal, stockRail);

      for (const sx of [-1, 1]) {
        // Curved front brass claw-shields
        const clawShield = new THREE.Mesh(
          createBeveledWingGeometry(
            [
              [0, -0.44],
              [0.24, -0.22],
              [0.22, 0.42],
              [-0.04, 0.52],
              [-0.08, -0.28],
            ],
            0.07,
            0.02
          ),
          brassMat
        );
        clawShield.position.set(sx * 0.28, 0.54, -0.78);
        clawShield.rotation.y = sx * 0.32;
        if (sx < 0) clawShield.scale.x = -1;

        // Swept torsion Ballista bow arm
        const bowArm = new THREE.Mesh(
          createSplineTubeGeometry(
            [
              [sx * 0.18, 0.54, -0.74],
              [sx * 0.78, 0.55, -0.62],
              [sx * 1.28, 0.56, -0.22],
            ],
            0.068,
            14,
            8
          ),
          brassMat
        );
        const bowString = new THREE.Mesh(
          createSplineTubeGeometry(
            [
              [sx * 1.25, 0.56, -0.2],
              [sx * 0.62, 0.55, 0.12],
              [0, 0.54, 0.38],
            ],
            0.018,
            8,
            6
          ),
          amberGlowMat
        );
        turret.add(clawShield, bowArm, bowString);
      }

      // Loaded Faceted Glowing Cyan Crystal Bolt
      const boltShaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, 1.35, 10),
        brassMat
      );
      boltShaft.rotation.x = Math.PI / 2;
      boltShaft.position.set(0, 0.62, -0.42);
      const crystalTip = new THREE.Mesh(
        new THREE.ConeGeometry(0.22, 0.74, 6),
        cyanCrystalMat
      );
      crystalTip.rotation.x = -Math.PI / 2;
      crystalTip.position.set(0, 0.62, -1.36);
      const crystalBase = new THREE.Mesh(
        new THREE.ConeGeometry(0.22, 0.26, 6),
        cyanCrystalMat
      );
      crystalBase.rotation.x = Math.PI / 2;
      crystalBase.position.set(0, 0.62, -0.86);
      turret.add(boltShaft, crystalTip, crystalBase);

      this.ballistaTurret = turret;
      g.add(turret);

      // Heroic Standing Goggled Siegesmith Pilot at Rear Helm
      const pilot = buildExplorerPilot3D({
        role: "siegesmith",
        seated: false,
        scale: 0.76,
      });
      pilot.position.set(0, 1.08, 0.92);
      g.add(pilot);
      this.activePilot = pilot;

      // 6 Detailed Spoked Brass-and-Iron Wheels + Beveled Brass Wheel Fenders
      const tireGeo = createLatheProfileGeometry(
        [
          [0.28, -0.22],
          [0.54, -0.2],
          [0.57, 0.0],
          [0.54, 0.2],
          [0.28, 0.22],
        ],
        18
      );
      tireGeo.rotateZ(Math.PI / 2);
      const rimRingGeo = new THREE.TorusGeometry(0.32, 0.048, 8, 16);
      rimRingGeo.rotateY(Math.PI / 2);
      const glowHubGeo = new THREE.TorusGeometry(0.22, 0.032, 8, 14);
      glowHubGeo.rotateY(Math.PI / 2);
      const spokeGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.56, 6);

      let wIdx = 0;
      for (const wx of [-1.26, 1.26]) {
        for (const wz of [-1.1, 0.18, 1.44]) {
          // Arched beveled brass fender above each wheel
          const fender = new THREE.Mesh(
            new THREE.TorusGeometry(0.62, 0.062, 8, 16, Math.PI),
            brassMat
          );
          fender.rotation.y = Math.PI / 2;
          fender.position.set(wx * 0.94, 0.62, wz);
          g.add(fender);

          const w = new THREE.Group();
          w.position.set(wx, 0.55, wz);
          const tire = new THREE.Mesh(tireGeo, darkMat);
          const sideSign = wx > 0 ? 1 : -1;
          const rimRing = new THREE.Mesh(rimRingGeo, brassMat);
          rimRing.position.x = sideSign * 0.21;
          const glowHub = new THREE.Mesh(glowHubGeo, amberGlowMat);
          glowHub.position.x = sideSign * 0.22;
          w.add(tire, rimRing, glowHub);

          for (let sp = 0; sp < 3; sp++) {
            const spoke = new THREE.Mesh(spokeGeo, brassMat);
            spoke.position.x = sideSign * 0.19;
            spoke.rotation.x = (sp / 3) * Math.PI;
            w.add(spoke);
          }

          g.add(w);
          this.rigWheels.push({ mesh: w, lx: wx, lz: wz, baseY: 0.55, phase: wIdx * 1.1 });
          wIdx += 1;
        }
      }
    }

    // Visible Sculpted 3D Attachments for ALL BASTION_UPGRADES (+ extended ab_* IDs)
    if (upSet.has("ab_cryo_mortar")) {
      const cryo = new THREE.Group();
      cryo.name = "upgrade_ab_cryo_mortar";
      cryo.userData = { upgrade: "ab_cryo_mortar" };
      const canister = new THREE.Mesh(
        createLatheProfileGeometry(
          [
            [0.08, 0.0],
            [0.34, 0.08],
            [0.38, 0.45],
            [0.3, 0.78],
            [0.14, 0.88],
          ],
          14
        ),
        cyanCrystalMat
      );
      canister.position.set(-0.68, 1.48, 1.18);
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.045, 8, 16), brassMat);
      band.rotation.x = Math.PI / 2;
      band.position.set(-0.68, 1.88, 1.18);
      cryo.add(canister, band);
      g.add(cryo);
    }

    if (upSet.has("ab_prism_pierce")) {
      const pierce = new THREE.Group();
      pierce.name = "upgrade_ab_prism_pierce";
      pierce.userData = { upgrade: "ab_prism_pierce" };
      for (const sx of [-0.96, 0.96]) {
        const lance = new THREE.Mesh(new THREE.ConeGeometry(0.13, 2.15, 6), cyanCrystalMat);
        lance.rotation.x = -Math.PI / 2;
        lance.position.set(sx, 1.26, -1.42);
        const collar = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.035, 8, 14), brassMat);
        collar.position.set(sx, 1.26, -0.45);
        pierce.add(lance, collar);
      }
      g.add(pierce);
    }

    if (upSet.has("ab_auto_turret")) {
      const miniSentinel = new THREE.Group();
      miniSentinel.name = "upgrade_ab_auto_turret";
      miniSentinel.userData = { upgrade: "ab_auto_turret" };
      const podDome = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), brassMat);
      podDome.position.set(-0.82, 2.02, 0.95);
      const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), amberGlowMat);
      beacon.position.set(-0.82, 2.3, 0.95);
      miniSentinel.add(podDome, beacon);
      g.add(miniSentinel);
    }

    if (upSet.has("ab_angle_mirrors")) {
      const mirrors = new THREE.Group();
      mirrors.name = "upgrade_ab_angle_mirrors";
      mirrors.userData = { upgrade: "ab_angle_mirrors" };
      for (const sx of [-1.2, 1.2]) {
        const vane = new THREE.Mesh(
          createBeveledWingGeometry(
            [
              [-0.06, -0.28],
              [0.24, -0.18],
              [0.24, 0.28],
              [-0.06, 0.34],
            ],
            0.05,
            0.015
          ),
          brassMat
        );
        vane.position.set(sx, 1.56, 0.42);
        vane.rotation.y = sx > 0 ? -0.42 : Math.PI + 0.42;
        mirrors.add(vane);
      }
      g.add(mirrors);
    }

    if (upSet.has("ab_chronos_harp")) {
      const harp = new THREE.Group();
      harp.name = "upgrade_ab_chronos_harp";
      harp.userData = { upgrade: "ab_chronos_harp" };
      harp.position.set(0, 2.48, 1.18);
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(0.52, 0.052, 8, 20, Math.PI * 1.35),
        brassMat
      );
      harp.add(arch);
      for (let s = -2; s <= 2; s++) {
        const str = new THREE.Mesh(
          new THREE.CylinderGeometry(0.014, 0.014, 0.78, 6),
          amberGlowMat
        );
        str.position.set(s * 0.13, 0.05, 0);
        harp.add(str);
      }
      this.chronosHarpStrings = harp;
      g.add(harp);
    }

    if (hasCrown) {
      const crown = new THREE.Group();
      crown.name = "upgrade_ab_citadel_crown";
      crown.userData = { upgrade: "ab_citadel_crown" };
      const circlet = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.065, 8, 22), amberGlowMat);
      circlet.rotation.x = Math.PI / 2;
      circlet.position.set(0, 2.62, 0.55);
      crown.add(circlet);
      g.add(crown);
    }

    if (upSet.has("ab_repulsor_prow")) {
      const repulsor = new THREE.Group();
      repulsor.name = "upgrade_ab_repulsor_prow";
      repulsor.userData = { upgrade: "ab_repulsor_prow" };
      const arc = new THREE.Mesh(
        new THREE.TorusGeometry(0.68, 0.065, 8, 20, Math.PI),
        cyanCrystalMat
      );
      arc.rotation.x = Math.PI / 2;
      arc.position.set(0, 0.92, -2.05);
      repulsor.add(arc);
      g.add(repulsor);
    }

    if (upSet.has("ab_chronos_lens")) {
      const lensGrp = new THREE.Group();
      lensGrp.name = "upgrade_ab_chronos_lens";
      lensGrp.userData = { upgrade: "ab_chronos_lens" };
      const monocle = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.045, 8, 18), brassMat);
      monocle.position.set(0, 1.78, -0.82);
      lensGrp.add(monocle);
      g.add(lensGrp);
    }

    if (upSet.has("ab_sky_grapnel")) {
      const grapnel = new THREE.Group();
      grapnel.name = "upgrade_ab_sky_grapnel";
      grapnel.userData = { upgrade: "ab_sky_grapnel" };
      const hook = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.52, 6), brassMat);
      hook.rotation.x = -Math.PI / 2;
      hook.position.set(0.68, 1.48, -1.48);
      grapnel.add(hook);
      g.add(grapnel);
    }

    for (const extraUpId of cleanUpgrades) {
      const sId = String(extraUpId || "");
      if (sId.startsWith("ab_") && !g.getObjectByName(`upgrade_${sId}`)) {
        const extraNode = new THREE.Group();
        extraNode.name = `upgrade_${sId}`;
        extraNode.userData = { upgrade: sId };
        const sigil = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), amberGlowMat);
        sigil.position.set(0.68, 1.92, 1.12);
        extraNode.add(sigil);
        g.add(extraNode);
      }
    }

    // Cross-Realm Unlocks, Zero-G Astro-Toad Mascot & Sibling Borrow Pennant
    if (this.crossRealmState?.cryoCannonUnlocked) {
      const cryoTrim = new THREE.Group();
      cryoTrim.name = "cross_realm_cryo_cannon_trim";
      cryoTrim.userData = { crossRealm: "cryoCannonUnlocked" };
      const frostCuff = new THREE.Mesh(
        new THREE.TorusGeometry(0.34, 0.068, 8, 18),
        cyanCrystalMat
      );
      frostCuff.position.set(0, 1.56, -1.45);
      cryoTrim.add(frostCuff);
      g.add(cryoTrim);
    }

    if (this.crossRealmState?.astroToadUnlocked || this.crossRealmState?.cryoCannonUnlocked) {
      const toadMascot = buildSanctuaryCreature3D("zero_g_toad", 1);
      toadMascot.name = "astro_toad_mascot";
      toadMascot.scale.setScalar(0.38);
      toadMascot.position.set(-0.74, 1.88, 1.38);
      g.add(toadMascot);
      this.astroToadMascot = toadMascot;
    }

    if (this.crossRealmState?.bastionMosaicTrim) {
      const mosaic = new THREE.Group();
      mosaic.name = "cross_realm_bastion_mosaic_trim";
      mosaic.userData = { crossRealm: "bastionMosaicTrim" };
      for (let t = 0; t < 4; t++) {
        const tile = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.16, 0),
          amberGlowMat
        );
        tile.position.set((t - 1.5) * 0.44, 1.24, -1.68);
        mosaic.add(tile);
      }
      g.add(mosaic);
    }

    if (this.crossRealmState?.silverMoonLantern) {
      const lantern = new THREE.Mesh(
        new THREE.TorusGeometry(0.26, 0.05, 8, 16),
        cyanCrystalMat
      );
      lantern.name = "silver_moon_lantern";
      lantern.position.set(0.76, 1.96, 1.44);
      g.add(lantern);
    }

    if (this.borrowedToyState?.active) {
      const pennant = new THREE.Group();
      pennant.name = "sibling_borrow_pennant";
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.25, 8), brassMat);
      mast.position.y = 0.62;
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), amberGlowMat);
      star.position.y = 1.32;
      pennant.add(mast, star);
      pennant.position.set(0.88, 1.75, 1.52);
      g.add(pennant);
    }

    this.rigGroup = g;
    const gy = this._baseHeight(this.rigState.x, this.rigState.z);
    this.rigGroup.position.set(this.rigState.x, gy + 0.16, this.rigState.z);
    this.rigGroup.rotation.set(this.rigState.pitch, this.rigState.heading, this.rigState.roll);
    this.scene.add(this.rigGroup);
  }

  populateEncounters(encounters = []) {
    for (const slot of this.gateSlots) {
      if (slot.group && this.scene) this.scene.remove(slot.group);
    }
    this.gateSlots = [];
    for (const b of this.laserBeams) {
      if (b.mesh && this.scene) this.scene.remove(b.mesh);
    }
    this.laserBeams = [];
    this.activeGateSlot = null;
    this._gateAutoPause = false;
    this._refreshTimeScaleState(0);
    this.opposition?.setPaused(this.isOppositionPaused());

    const validWave = (Array.isArray(encounters) ? encounters : [])
      .filter((enc) => enc && typeof enc === "object")
      .slice(0, 4);
    const hasCryoMortar = this.rigState.upgrades.includes("ab_cryo_mortar");

    validWave.forEach((enc, idx) => {
      const anchor = BATTERY_ANCHORS[idx % BATTERY_ANCHORS.length];
      const slot = {
        index: idx,
        encounter: enc,
        x: anchor.x,
        z: anchor.z,
        y: this._baseHeight(anchor.x, anchor.z),
        rotY: anchor.rotY,
        cleared: false,
        group: null,
      };
      if (this.scene) {
        slot.group = buildBastionEncounter3DGroup(slot, hasCryoMortar);
        this.scene.add(slot.group);
      }
      this.gateSlots.push(slot);
    });

    this.ghostController?.startWave(this.rigState);
    this._syncExpeditionBeacon();
  }

  areAllEncountersCleared() {
    return this.gateSlots.length > 0 && this.gateSlots.every((s) => Boolean(s.cleared));
  }

  engageAutopilotToNextGate() {
    const openSlots = this.gateSlots.filter((s) => !s.cleared);
    if (!openSlots.length) return null;
    for (const s of openSlots) {
      s._dismissedUntilLeave = false;
    }
    let best = openSlots[0];
    if (best.encounter?.worldId !== "W0") {
      let bestD = Infinity;
      for (const s of openSlots) {
        const ax = s.x + Math.sin(s.rotY) * 5.6;
        const az = s.z + Math.cos(s.rotY) * 5.6;
        const d = Math.hypot(ax - this.rigState.x, az - this.rigState.z);
        if (d < bestD) {
          bestD = d;
          best = s;
        }
      }
    }
    this.autopilotTarget = {
      x: best.x + Math.sin(best.rotY) * 5.4,
      z: best.z + Math.cos(best.rotY) * 5.4,
      slot: best,
    };
    this._syncExpeditionBeacon();
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

  updateDialPreview(val) {
    this.dialPreviewValue = clampFinite(val, -10000, 10000, 0);
    const slot =
      this.activeGateSlot || this.gateSlots.find((s) => !s.cleared) || this.gateSlots[0] || null;
    if (!slot) return null;
    return updateBastionEncounterDialPreview(slot, this.dialPreviewValue);
  }

  previewDialOnActiveGate(val) {
    return this.updateDialPreview(val);
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
    slot.group = buildBastionEncounter3DGroup(
      slot,
      this.rigState.upgrades.includes("ab_cryo_mortar")
    );
    this.scene.add(slot.group);
    updateBastionEncounterDialPreview(slot, this.dialPreviewValue);
  }

  playTwinBeamVisual(isRepel = false) {
    const slot =
      this.activeGateSlot || this.gateSlots.find((s) => !s.cleared) || this.gateSlots[0] || null;
    if (!slot || !this.scene) return;
    const color = isRepel ? 0xffae42 : 0x7ee8fa;

    for (const offset of [-2.9, 2.9]) {
      const start = new THREE.Vector3(this.rigState.x, this.rigState.y + 1.4, this.rigState.z);
      const end = new THREE.Vector3(
        slot.x + offset * Math.cos(slot.rotY),
        slot.y + 2.6,
        slot.z - offset * Math.sin(slot.rotY)
      );
      const dist = Math.max(0.25, start.distanceTo(end));
      const cyl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.13, dist, 8),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92 })
      );
      cyl.position.copy(start).lerp(end, 0.5);
      cyl.lookAt(end);
      cyl.rotateX(Math.PI / 2);
      this.scene.add(cyl);
      this.laserBeams.push({ mesh: cyl, life: 0.36 });
    }
    triggerBastionTwinBeamFX(slot, Boolean(isRepel));
  }

  _pickSafeRelicDropCoord() {
    const candidates = [
      { x: 0, z: 6.5 },
      { x: -12, z: 4.5 },
      { x: 12, z: 4.5 },
      { x: 0, z: -9.5 },
    ];
    for (const c of candidates) {
      if (Math.hypot(c.x - this.rigState.x, c.z - this.rigState.z) >= 5.2) {
        return { dropX: c.x, dropY: this._baseHeight(c.x, c.z) + 0.2, dropZ: c.z };
      }
    }
    return { dropX: 0, dropY: this._baseHeight(0, 6.5) + 0.2, dropZ: 6.5 };
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
    if (!slot) return null;

    const hasCryoMortar = this.rigState.upgrades.includes("ab_cryo_mortar");
    const fxRes = applyBastionEncounterCommitFX(slot, safeRes, safeEnc || slot.encounter, {
      hasCryoMortar,
    });

    if (fxRes?.splatter) {
      this.audio?.playGentleMiss?.();
      this.onWorldActivity(1, 0, "cryoGelSplats");
      const worldSplatX = slot.x + fxRes.splatter.splatX;
      const worldSplatZ = slot.z + fxRes.splatter.splatZ * 0.45;
      this.opposition?.spawnCryoChillZone(
        worldSplatX,
        this._baseHeight(worldSplatX, worldSplatZ),
        worldSplatZ,
        hasCryoMortar
      );
      return fxRes;
    }

    if (fxRes?.cleared) {
      const isOverdrive = Boolean(safeRes.overdrive);
      if (this.activeGateSlot === slot) {
        this.activeGateSlot = null;
        this._gateAutoPause = false;
      }
      this._refreshTimeScaleState(0);
      this.opposition?.setPaused(this.isOppositionPaused());

      this.audio?.playGearBurst?.(isOverdrive);
      if (safeRes.outcome === "warm_reveal") {
        this._triggerSpiritFoxReveal(slot);
        this.audio?.playFoxReveal?.();
      } else {
        this.audio?.playClear?.(isOverdrive);
      }

      this.opposition?.spawnGearConfettiBurst(slot.x, slot.y + 1.8, slot.z - 6.0, 28);
      this.opposition?.triggerCitadelShockwave(slot.x, slot.z, 15.0);

      // Slipstream Speed Boost (1.30x normal / 1.42x overdrive, strictly guarded by !rigAnim && !autopilotTarget)
      this.slipstreamVfx?.triggerClearBoost({
        x: this.rigState.x,
        y: this.rigState.y,
        z: this.rigState.z,
        overdrive: isOverdrive,
      });
      this.audio?.playSlipstreamBoost?.(isOverdrive);
      if (!this.rigAnim && !this.autopilotTarget && this.slipstreamVfx?.isActive()) {
        this.rigState.speed = Math.max(
          finiteOr(this.rigState.speed, 0),
          isOverdrive ? 11.8 : 10.2
        );
        const h = Math.atan2(
          Math.sin(finiteOr(this.rigState.heading, 0)),
          Math.cos(finiteOr(this.rigState.heading, 0))
        );
        this.rigState.vx = -Math.sin(h) * this.rigState.speed;
        this.rigState.vz = -Math.cos(h) * this.rigState.speed;
      }

      this.horizonWonder?.notifyTempleCleared(this._pickSafeRelicDropCoord());

      if (fxRes.mysteryId) {
        this.audio?.playAstrolabeLock?.();
        this.onMysteryFound(fxRes.mysteryId);
      }

      if (this.areAllEncountersCleared() && this.ghostController?.waveActive) {
        this.lastGhostWaveResult = this.ghostController.completeWave(
          this._boundProgressRef,
          this.rigState
        );
        if (this.lastGhostWaveResult?.isNewRecord) {
          this.onOppositionEvent({
            kind: "personal_record",
            shardsEarned: 3,
            message: this.lastGhostWaveResult.bannerText || "NEW PERSONAL RECORD! 🏆",
          });
        }
      }
      this._syncExpeditionBeacon();
    }

    return fxRes;
  }

  resolveActiveGateCommit(result = {}, enc = null) {
    return this.playCommitVisual(result, enc);
  }

  triggerRealmQuickAction() {
    if (
      this.rigState.upgrades.includes("ab_prism_pierce") ||
      this.rigState.rigId === "prism_rail_skiff"
    ) {
      return this.opposition?.firePrismPiercePulse(
        this.rigState,
        this.rigState.upgrades.includes("ab_angle_mirrors")
      );
    }
    return this.toggleBulletTime();
  }

  resetFreshSnow() {
    this.opposition?.refreshIntactPods();
    return true;
  }

  triggerGuardianAwakening(worldId = "W1") {
    this.guardianAwakeWorldId = String(worldId || "W1");
    this.guardianAwakeTimer = 4.8;
    this.guardianAwakeningCount += 1;
    if (this.guardianBeam) {
      this.guardianBeam.visible = true;
      this.guardianBeamMat.opacity = 0.82;
    }
    this.audio?.playGuardianAwakening?.();
  }

  triggerSkyWhale() {
    this.whaleTimer = 11.0;
    if (this.skyWhale) this.skyWhale.visible = true;
    this.audio?.playWhaleSong?.();
    this.onMysteryFound("aurora_whale");
  }

  triggerOverdriveStreakWonder() {
    this.triggerSkyWhale();
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

  getLocalMultiplayerPose() {
    return {
      x: round3(this.rigState.x),
      y: round3(this.rigState.y),
      z: round3(this.rigState.z),
      heading: round3(this.rigState.heading),
      speed: round3(this.rigState.speed),
      chassisOrMount: this.rigState.rigId,
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

  _updateDprGovernor(rawDt) {
    if (!this.webglAvailable || !this.renderer) return;
    const numDt = Number(rawDt);
    if (!Number.isFinite(numDt) || !(numDt > 0)) return;

    const frameMs = Math.max(4, Math.min(100, numDt * 1000));
    this.dprGovernor.emaFrameMs = this.dprGovernor.emaFrameMs * 0.9 + frameMs * 0.1;

    if (this.dprGovernor.cooldownSec > 0) {
      this.dprGovernor.cooldownSec = Math.max(0, this.dprGovernor.cooldownSec - Math.min(2, numDt));
      return;
    }

    const dt = Math.min(0.05, numDt);
    if (this.dprGovernor.emaFrameMs > 22.0) {
      this.dprGovernor.highLoadSec += dt;
      this.dprGovernor.lowLoadSec = 0;
      if (
        this.dprGovernor.highLoadSec >= 0.8 &&
        this.dprGovernor.currentDpr > this.dprGovernor.minDpr
      ) {
        this.dprGovernor.currentDpr = Math.max(
          this.dprGovernor.minDpr,
          Number((this.dprGovernor.currentDpr - 0.15).toFixed(2))
        );
        this.renderer.setPixelRatio(this.dprGovernor.currentDpr);
        this.dprGovernor.highLoadSec = 0;
        this.dprGovernor.cooldownSec = 1.5;
      }
    } else if (this.dprGovernor.emaFrameMs < 14.5) {
      this.dprGovernor.lowLoadSec += dt;
      this.dprGovernor.highLoadSec = 0;
      if (
        this.dprGovernor.lowLoadSec >= 2.0 &&
        this.dprGovernor.currentDpr < this.dprGovernor.maxDpr
      ) {
        this.dprGovernor.currentDpr = Math.min(
          this.dprGovernor.maxDpr,
          Number((this.dprGovernor.currentDpr + 0.1).toFixed(2))
        );
        this.renderer.setPixelRatio(this.dprGovernor.currentDpr);
        this.dprGovernor.lowLoadSec = 0;
        this.dprGovernor.cooldownSec = 2.0;
      }
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
      this._updateDprGovernor(rawDt);

      const clockDt = this.clock.getDelta();
      const wallDt = Math.min(0.45, Math.max(1 / 120, clockDt || rawDt));
      this.step(wallDt);
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
    return totalDt;
  }

  _step(dt = 1 / 60) {
    return this.step(dt);
  }

  _update(dt) {
    if (!Number.isFinite(dt) || !(dt > 0)) return;
    this.simElapsed += dt;
    this.elapsed = this.simElapsed;
    this.elapsedTime = this.simElapsed;

    const spec =
      BASTION_RIG_SPECS.find((r) => r.id === this.rigState.rigId) || BASTION_RIG_SPECS[0];
    const isSkiff = this.rigState.rigId === "prism_rail_skiff";

    // 1. Step Rover Motion via core/world-sim.js stepVehicleKinematics + Autopilot
    let steer = this.rigState.steerInput;
    let throttle = this.rigState.throttleInput;
    let boosting = Boolean(this.rigState.boosting || this.rigState.inSurge);
    const wasAutopilot = Boolean(this.autopilotTarget);

    if (this.autopilotTarget) {
      const dx = this.autopilotTarget.x - this.rigState.x;
      const dz = this.autopilotTarget.z - this.rigState.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 1.6) {
        this.rigState.heading = this.autopilotTarget.slot.rotY;
        this.rigState.speed = 0;
        this.rigState.vx = 0;
        this.rigState.vz = 0;
        this.autopilotTarget = null;
        throttle = 0;
      } else {
        const desiredHeading = Math.atan2(-dx, -dz);
        const diff = wrapAngleDiff(desiredHeading, this.rigState.heading);
        steer = Math.max(-1, Math.min(1, -diff * 2.8));
        throttle = Math.abs(diff) > 0.9 ? 0.35 : dist > 6.0 ? 1.0 : 0.62;
        boosting = true;
      }
    }

    const biome = resolveActiveBiome("arc_bastion", this.rigState.x, this.rigState.z);
    const barricadeDrag = this.opposition
      ? this.opposition.getBarricadeDragFactor(
          this.rigState.x,
          this.rigState.z,
          this.rigState.speed,
          !isSkiff
        )
      : 1.0;
    const slipMul =
      wasAutopilot || !this.slipstreamVfx ? 1.0 : this.slipstreamVfx.getSpeedMultiplier();

    const nextKin = stepVehicleKinematics(
      this.rigState,
      {
        steer,
        throttle,
        boostActive: boosting,
        slipstreamMultiplier: slipMul,
        surfaceSpeedFactor: biome.speedMul * barricadeDrag,
      },
      {
        topSpeed: spec.topSpeed,
        turnRate: spec.turnRate,
        accelRate: isSkiff ? 11.2 : 9.4,
        decelRate: isSkiff ? 6.8 : 8.2,
        maxRadius: BASTION_WORLD_RADIUS,
      },
      dt
    );
    Object.assign(this.rigState, nextKin);

    const groundY = this._baseHeight(this.rigState.x, this.rigState.z);
    const hoverOffset = isSkiff ? 0.34 + Math.sin(this.simElapsed * 4.2) * 0.1 : 0.16;
    this.rigState.y = groundY + hoverOffset;

    const speedNorm = Math.min(1, Math.abs(this.rigState.speed) / Math.max(1, spec.topSpeed));
    const targetRoll = -steer * speedNorm * (isSkiff ? 0.3 : 0.07);
    this.rigState.roll += (targetRoll - this.rigState.roll) * Math.min(1, dt * 10);

    if (this.rigGroup) {
      this.rigGroup.position.set(this.rigState.x, this.rigState.y, this.rigState.z);
      this.rigGroup.rotation.set(this.rigState.pitch, this.rigState.heading, this.rigState.roll);

      for (const w of this.rigWheels) {
        w.mesh.rotation.x -= this.rigState.speed * dt * 1.45;
      }
      if (this.frontGearRam) {
        this.frontGearRam.rotation.x -= (1.8 + Math.abs(this.rigState.speed) * 0.45) * dt;
      }
      if (this.ballistaTurret && this.activeGateSlot) {
        const s = this.activeGateSlot;
        const worldAim = Math.atan2(-(s.x - this.rigState.x), -(s.z - this.rigState.z));
        this.ballistaTurret.rotation.y = wrapAngleDiff(worldAim, this.rigState.heading) * 0.65;
      }
      for (const tc of this.skiffThrusterCones) {
        const pulse = 0.65 + speedNorm * 0.55 + Math.sin(this.simElapsed * 16 + tc.phase) * 0.12;
        tc.mesh.scale.set(0.9, pulse, 0.9);
      }
      if (this.skiffChronosCore) {
        this.skiffChronosCore.rotation.y += dt * 1.65;
        this.skiffChronosCore.rotation.z = Math.sin(this.simElapsed * 2.8) * 0.14;
      }
      if (this.activePilot) {
        animateExplorerPilot3D(
          this.activePilot,
          this.simElapsed,
          speedNorm,
          steer,
          isSkiff
        );
      }
      if (this.astroToadMascot) {
        this.astroToadMascot.position.y = 1.88 + Math.sin(this.simElapsed * 3.6) * 0.06;
        this.astroToadMascot.rotation.y = Math.sin(this.simElapsed * 1.9) * 0.18;
      }
    }

    this.audio?.updateRigHum?.(speedNorm, this.rigState.rigId, this.isBulletTimeActive());

    // 2. Siegesmith Gear-Foundry Pad (-10, 26) Spatial Hysteresis
    if (this.foundryHoloCog) {
      this.foundryHoloCog.rotation.y = this.simElapsed * 1.5;
      this.foundryHoloCog.position.y = 3.8 + Math.sin(this.simElapsed * 2.4) * 0.24;
    }
    if (this.garagePadCooldown > 0) {
      this.garagePadCooldown = Math.max(0, this.garagePadCooldown - dt);
    }
    const dFoundry = Math.hypot(
      this.rigState.x - GEAR_FOUNDRY_PAD_COORD.x,
      this.rigState.z - GEAR_FOUNDRY_PAD_COORD.z
    );
    if (!this.garagePadArmed && dFoundry > 7.5) {
      this.garagePadArmed = true;
    }
    if (
      dFoundry < 4.4 &&
      this.garagePadArmed &&
      this.garagePadCooldown <= 0 &&
      !this.encounterDockOpen &&
      !this.rigAnim
    ) {
      this.garagePadArmed = false;
      this.garagePadCooldown = 3.5;
      this.rigState.speed *= 0.25;
      this.autopilotTarget = null;
      this.audio?.playGarageLift?.();
      this.onGaragePadEntered();
    }

    // 3. Central Moonwell Sundial (0, 0) — ONLY when !encounterDockOpen && !activeGateSlot!
    const dMoon = Math.hypot(this.rigState.x, this.rigState.z);
    if (dMoon > 6.5) {
      this._moonMysterySent = false;
    }
    if (
      !this.encounterDockOpen &&
      !this.activeGateSlot &&
      dMoon < 4.6 &&
      Math.abs(this.rigState.speed) < 2.5
    ) {
      this.moonDwellSec += dt;
      if (this.moonDwellSec > 1.4 && !this._moonMysterySent) {
        this._moonMysterySent = true;
        this.onMysteryFound("moon_center");
      }
    } else {
      this.moonDwellSec = 0;
    }

    // 4. Siege Battery Docking Proximity Check BEFORE Opposition Step (Mandatory Math-Pause!)
    let nearest = null;
    let nearestDist = Infinity;
    for (const slot of this.gateSlots) {
      if (slot.cleared) continue;
      const appX = slot.x + Math.sin(slot.rotY) * 5.8;
      const appZ = slot.z + Math.cos(slot.rotY) * 5.8;
      const dPad = Math.hypot(appX - this.rigState.x, appZ - this.rigState.z);
      const dCenter = Math.hypot(slot.x - this.rigState.x, slot.z - this.rigState.z);
      const d = Math.min(dPad, dCenter);
      if (slot._dismissedUntilLeave) {
        if (d > 11.5) {
          slot._dismissedUntilLeave = false;
        } else {
          continue;
        }
      }
      if (d < nearestDist) {
        nearestDist = d;
        nearest = slot;
      }
    }

    if (nearest && nearestDist <= 6.2) {
      if (this.activeGateSlot !== nearest) {
        this.activeGateSlot = nearest;
        this._gateAutoPause = true;
        this.autopilotTarget = null;
        this.opposition?.setPaused(true);
        this.onApproachGate(nearest.encounter, nearest);
      }
    } else if (
      this.activeGateSlot &&
      (nearestDist > 11.2 || this.activeGateSlot.cleared) &&
      !this.rigAnim
    ) {
      this.activeGateSlot = null;
      this._gateAutoPause = false;
      this.opposition?.setPaused(this.isOppositionPaused());
      this.onLeaveGate();
    }

    // 5. Step Clockwork Opposition + 0.08x Crystal Bullet-Time Dome (bitwise 0.0 when paused!)
    const timeScale = this.opposition
      ? this.opposition.update(dt, {
          encounterDockOpen: this.encounterDockOpen,
          activeGateSlot: Boolean(this.activeGateSlot),
          bulletTimeRequested: this.bulletTimeRequested,
          rigState: this.rigState,
        })
      : this._refreshTimeScaleState(dt);
    this.lastTimeScale = timeScale;

    // 6. Step Field Expeditions (strictly gated off when encounterDockOpen || activeGateSlot || autopilotTarget)
    const canAdvanceExpedition =
      !this.encounterDockOpen && !this.activeGateSlot && !this.autopilotTarget;
    if (canAdvanceExpedition && this.expeditionState) {
      const expRes = stepFieldExpedition(this.expeditionState, this.rigState.x, this.rigState.z, 5.4);
      this.expeditionState = expRes.state;
      if (expRes.justCollectedWaypoint) {
        this.audio?.playExpeditionWaypoint?.();
        this.opposition?.spawnGearConfettiBurst(
          this.rigState.x,
          this.rigState.y + 1.2,
          this.rigState.z,
          18
        );
        if (expRes.justCompletedExpedition) {
          const done = expRes.justCompletedExpedition;
          if (this._boundProgressRef?.games?.arc_bastion) {
            this._boundProgressRef.games.arc_bastion.expeditionsCompleted = Math.max(
              Number(this._boundProgressRef.games.arc_bastion.expeditionsCompleted) || 0,
              this.expeditionState.completedTotal || 0
            );
          }
          this.onWorldActivity(1, expRes.shardsEarned, "expeditionsCompleted");
          this.onOppositionEvent({
            kind: "expedition_completed",
            shardsEarned: 0,
            message: `${done.icon} ${done.title} complete! +${expRes.shardsEarned}💎`,
          });
        } else {
          const wpLabel = expRes.justCollectedWaypoint.label || "Waypoint";
          this.onWorldActivity(0, expRes.shardsEarned, "expeditionWaypoints");
          this.onOppositionEvent({
            kind: "expedition_waypoint",
            shardsEarned: 0,
            message: `🧭 ${wpLabel} reached! +${expRes.shardsEarned}💎`,
          });
        }
        this._syncExpeditionBeacon();
      }
    }
    if (this.expeditionBeaconGroup) {
      const hasWp = Array.isArray(this.expeditionState?.waypoints)
        ? this.expeditionState.waypoints.some((w) => !w.collected)
        : false;
      this.expeditionBeaconGroup.visible = Boolean(hasWp && canAdvanceExpedition);
      if (this.expeditionCrystal && this.expeditionBeaconGroup.visible) {
        this.expeditionCrystal.rotation.y += dt * 2.2;
      }
    }

    // 7. Step Self-Ghost PB Rover, Siege Batteries, Co-Op, Slipstream VFX & Horizon Wonder
    this.ghostController?.update(dt, this.rigState, timeScale.mathPaused);
    updateBastionEncounterAnimations(this.gateSlots, dt, this.simElapsed);
    this.coop?.update(dt, this.rigState, Boolean(this.rigAnim));

    this.slipstreamVfx?.step(dt, this.simElapsed, {
      x: this.rigState.x,
      y: this.rigState.y,
      z: this.rigState.z,
      heading: this.rigState.heading,
      speed: this.rigState.speed,
      boosting: this.rigState.boosting,
      inSurge: this.rigState.inSurge,
      wingSpan: isSkiff ? 1.55 : 1.25,
    });
    this.horizonWonder?.step(
      dt,
      this.simElapsed,
      { x: this.rigState.x, y: this.rigState.y, z: this.rigState.z },
      (ev) => {
        this.audio?.playRelicChime?.();
        this.onOppositionEvent(ev);
      }
    );

    // 8. Animate Celestial Clockwork Sky-Rings, Moonwell, Guardian, Lasers & Sky-Whale
    const skyDt = timeScale.ambientDt;
    if (this.celestialClockworkRings) {
      this.celestialClockworkRings.ringOuter.rotation.z += skyDt * 0.08;
      this.celestialClockworkRings.ringMid.rotation.z -= skyDt * 0.13;
      this.celestialClockworkRings.ringInner.rotation.z += skyDt * 0.19;
    }
    if (this.moonTotem) {
      this.moonTotem.rotation.y += skyDt * 0.9;
    }
    if (this.guardianHalo) {
      this.guardianHalo.rotation.z += (skyDt > 0 ? skyDt : dt * 0.2) * 0.7;
    }
    if (this.guardianAwakeTimer > 0) {
      this.guardianAwakeTimer = Math.max(0, this.guardianAwakeTimer - dt);
      if (this.guardianBeam) {
        this.guardianBeamMat.opacity = Math.min(0.85, this.guardianAwakeTimer * 0.35);
        if (this.guardianAwakeTimer <= 0) this.guardianBeam.visible = false;
      }
    }
    if (this.whaleTimer > 0 && this.skyWhale) {
      this.whaleTimer = Math.max(0, this.whaleTimer - dt);
      const u = 1 - this.whaleTimer / 11.0;
      this.skyWhale.position.set(-48 + u * 96, 24 + Math.sin(u * Math.PI) * 10, -34);
      this.skyWhale.rotation.y = Math.PI / 2;
      if (this.skyWhaleFins) {
        const flap = Math.sin(this.simElapsed * 3.2) * 0.26;
        if (this.skyWhaleFins.leftFin) this.skyWhaleFins.leftFin.rotation.z = 0.2 + flap;
        if (this.skyWhaleFins.rightFin) this.skyWhaleFins.rightFin.rotation.z = -0.2 - flap;
        if (this.skyWhaleFins.tailFluke) {
          this.skyWhaleFins.tailFluke.rotation.x = Math.sin(this.simElapsed * 2.6) * 0.22;
        }
      }
      if (this.whaleTimer <= 0) this.skyWhale.visible = false;
    }
    if (this.spiritFoxTimer > 0 && this.spiritFox) {
      this.spiritFoxTimer = Math.max(0, this.spiritFoxTimer - dt);
      const foxUd = this.spiritFox.userData || {};
      if (foxUd.tail) {
        foxUd.tail.rotation.z = Math.sin(this.simElapsed * 6.2) * 0.32;
      }
      if (foxUd.head) {
        foxUd.head.rotation.x = Math.sin(this.simElapsed * 3.4) * 0.12;
        foxUd.head.rotation.y = Math.sin(this.simElapsed * 2.1) * 0.18;
      }
      if (this.spiritFoxTimer <= 0) {
        this.spiritFox.visible = false;
      }
    }
    for (let i = this.laserBeams.length - 1; i >= 0; i--) {
      const b = this.laserBeams[i];
      b.life -= dt;
      b.mesh.material.opacity = Math.max(0, b.life * 2.5);
      if (b.life <= 0) {
        if (this.scene) this.scene.remove(b.mesh);
        this.laserBeams.splice(i, 1);
      }
    }

    // 9. Smooth Roblox-Style Tactician Follow/Orbit/Zoom Camera + Slipstream Boost FOV Kick
    if (this.camera) {
      this.cameraRig.step({
        dt,
        rigState: this.rigState,
        activeGateSlot: this.activeGateSlot,
        encounterDockOpen: this.encounterDockOpen,
        groundHeightAt: (x, z) => this._baseHeight(x, z),
        camera: this.camera,
      });

      const baseFov = this._baseCameraFov;
      const framingGate = Boolean(this.activeGateSlot && this.encounterDockOpen);
      const targetFov =
        this.slipstreamVfx?.isActive() && !framingGate ? baseFov + 5.5 : baseFov;
      const nextFov = this.camera.fov + (targetFov - this.camera.fov) * Math.min(1, dt * 6.5);
      if (Math.abs(nextFov - this.camera.fov) > 0.02) {
        this.camera.fov = nextFov;
        this.camera.updateProjectionMatrix();
      }
    }
  }

  resize(width, height) {
    const w = Math.max(1, Number(width || this.canvas?.clientWidth || 960));
    const h = Math.max(1, Number(height || this.canvas?.clientHeight || 600));
    if (this.camera) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
    if (this.webglAvailable && this.renderer) {
      this.renderer.setSize(w, h, false);
    }
  }

  dispose() {
    this.stop();
    this.opposition?.dispose();
    this.coop?.dispose();
    this.slipstreamVfx?.dispose?.();
    this.horizonWonder?.dispose?.();
    if (this.renderer) {
      try {
        this.renderer.dispose();
      } catch (_) {}
      this.renderer = null;
    }
    this.webglAvailable = false;
  }
}
