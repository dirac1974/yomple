/**
 * Oddroot Wilds: Alchemy Sanctuary — 60fps Three.js 3D Bioluminescent Archipelago Engine
 * Implements the full Realm3DAdapter contract, 4-stop Toon + Fresnel shaders, DPR governor,
 * Archipelago Updraft Cushion, Starlight Glide-Cape & Bramble-Plow Boar mounts, 3D Siphon-Staff,
 * Active Blight/Gloom Opposition, All 33 W0-W7 3D Sanctuary Shrines, Creature Morphogenesis,
 * Self-Ghost PB trails, and Live 2-Player 3D Co-Op Partner Presence & Shared Star-Coins.
 */

import * as THREE from "../vendor/three.module.min.js";
import {
  BlightOppositionSystem,
  BASE_SIPHON_RADIUS,
} from "./blight-opposition.js";
import {
  SanctuaryMenagerie3D,
  getSanctuaryJournalEntries,
} from "./creatures-3d.js";
import {
  OddrootShrineManager,
  createOddrootToonGradient,
  createOddrootToonRimMaterial,
} from "./shrines-3d.js";
import {
  OddrootCoopManager,
  SHARED_COIN_IDS,
} from "./coop-3d.js";
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

export {
  getSanctuaryJournalEntries,
  SHARED_COIN_IDS,
  buildTempleSanctuaryFrame,
  stepTempleSanctuaryFrame,
};

export const MAX_SPORE_LILIES = 96;

export const SANCTUARY_ISLANDS = [
  { id: "center", name: "World-Tree & Moonwell Sanctuary", x: 0, z: 0, radius: 16.5, topY: 0.0 },
  { id: "south", name: "Sunbeam Entry & Workshop Terrace", x: 0, z: 24, radius: 12.5, topY: 0.4 },
  { id: "west", name: "West Cauldron Grove", x: -24, z: -12, radius: 12.0, topY: 1.2 },
  { id: "east", name: "East Conservatory Looms", x: 24, z: -12, radius: 12.0, topY: 1.2 },
  { id: "north", name: "North Starlight Cliff", x: 0, z: -30, radius: 13.0, topY: 2.0 },
  { id: "obs", name: "Northern Observatory Ridge", x: 0, z: -60, radius: 11.5, topY: 3.6 },
  { id: "grotto", name: "Sunken Starlight Grotto", x: -41, z: 10, radius: 11.5, topY: 0.8 },
  { id: "skyroot", name: "Sky-Root Windward Spire", x: 41, z: 10, radius: 11.5, topY: 1.8 },
];

export const SANCTUARY_BRIDGES = [
  { ax: 0, az: 14.5, ay: 0.35, bx: 0, bz: 13.0, by: 0.05, width: 5.8 },
  { ax: -12.5, az: -5.0, ay: 0.1, bx: -16.0, bz: -7.8, by: 1.1, width: 4.8 },
  { ax: 12.5, az: -5.0, ay: 0.1, bx: 16.0, bz: -7.8, by: 1.1, width: 4.8 },
  { ax: 0, az: -14.8, ay: 0.1, bx: 0, bz: -18.5, by: 1.9, width: 5.2 },
  { ax: -16.5, az: -18.0, ay: 1.2, bx: -9.8, bz: -24.0, by: 1.95, width: 4.2 },
  { ax: 16.5, az: -18.0, ay: 1.2, bx: 9.8, bz: -24.0, by: 1.95, width: 4.2 },
  { ax: 0, az: -41.5, ay: 2.0, bx: 0, bz: -49.5, by: 3.55, width: 4.6 },
  { ax: -30.5, az: -3.6, ay: 1.18, bx: -34.8, bz: 1.9, by: 0.82, width: 4.8 },
  { ax: 30.5, az: -3.6, ay: 1.18, bx: 34.8, bz: 1.9, by: 1.78, width: 4.8 },
];

export const SHRINE_ANCHORS = [
  { x: -24, y: 1.2, z: -15, rotY: 0.38 },
  { x: 24, y: 1.2, z: -15, rotY: -0.38 },
  { x: 0, y: 2.0, z: -33, rotY: 0.0 },
  { x: 0, y: 0.0, z: -12, rotY: 0.0 },
];

const AUTOPILOT_BRIDGE_TRANSITIONS = {
  "south->center": [
    { x: 0, z: 15.0 },
    { x: 0, z: 11.0 },
  ],
  "center->south": [
    { x: 0, z: 11.0 },
    { x: 0, z: 15.0 },
  ],
  "center->west": [
    { x: -11.5, z: -4.6 },
    { x: -17.5, z: -8.8 },
  ],
  "west->center": [
    { x: -17.5, z: -8.8 },
    { x: -11.5, z: -4.6 },
  ],
  "center->east": [
    { x: 11.5, z: -4.6 },
    { x: 17.5, z: -8.8 },
  ],
  "east->center": [
    { x: 17.5, z: -8.8 },
    { x: 11.5, z: -4.6 },
  ],
  "center->north": [
    { x: 0, z: -13.0 },
    { x: 0, z: -20.5 },
  ],
  "north->center": [
    { x: 0, z: -20.5 },
    { x: 0, z: -13.0 },
  ],
  "west->north": [
    { x: -17.2, z: -17.4 },
    { x: -9.2, z: -24.5 },
  ],
  "north->west": [
    { x: -9.2, z: -24.5 },
    { x: -17.2, z: -17.4 },
  ],
  "east->north": [
    { x: 17.2, z: -17.4 },
    { x: 9.2, z: -24.5 },
  ],
  "north->east": [
    { x: 9.2, z: -24.5 },
    { x: 17.2, z: -17.4 },
  ],
  "north->obs": [
    { x: 0, z: -39.5 },
    { x: 0, z: -51.0 },
  ],
  "obs->north": [
    { x: 0, z: -51.0 },
    { x: 0, z: -39.5 },
  ],
  "west->grotto": [
    { x: -29.8, z: -4.5 },
    { x: -35.6, z: 3.0 },
  ],
  "grotto->west": [
    { x: -35.6, z: 3.0 },
    { x: -29.8, z: -4.5 },
  ],
  "east->skyroot": [
    { x: 29.8, z: -4.5 },
    { x: 35.6, z: 3.0 },
  ],
  "skyroot->east": [
    { x: 35.6, z: 3.0 },
    { x: 29.8, z: -4.5 },
  ],
};

const AUTOPILOT_ISLAND_ADJ = {
  south: ["center"],
  center: ["south", "west", "east", "north"],
  west: ["center", "north", "grotto"],
  east: ["center", "north", "skyroot"],
  north: ["center", "west", "east", "obs"],
  obs: ["north"],
  grotto: ["west"],
  skyroot: ["east"],
};

export const WORKSHOP_PAD_COORD = { x: -7.5, y: 0.42, z: 23.5 };

export const ODDROOT_MOUNT_SPECS = [
  {
    id: "bramble_boar",
    aliases: ["boar"],
    name: "Bramble-Plow Boar",
    tag: "Kinetic Thicket Charger",
    icon: "🐗",
    topSpeed: 18.0,
    turnRate: 2.65,
    plowWidth: 3.2,
    primaryHex: 0xd98a2b,
    secondaryHex: 0x2c4230,
    glowHex: 0x7ee081,
  },
  {
    id: "starlight_glider",
    aliases: ["glide_cape", "moon_stag"],
    name: "Starlight Glide-Cape",
    tag: "Updraft Alchemist",
    icon: "🦋",
    topSpeed: 19.4,
    turnRate: 3.1,
    plowWidth: 2.8,
    primaryHex: 0x45d9c6,
    secondaryHex: 0x23294d,
    glowHex: 0xf7d06b,
  },
];

export const SIPHON_ORB_SPECS = {
  sun_orb: {
    id: "sun_orb",
    symbol: "+",
    colorHex: 0xffcf56,
    emissiveHex: 0xf59e0b,
    arcHeight: 2.2,
    buoyantLift: 0.0,
  },
  frost_spore: {
    id: "frost_spore",
    symbol: "-",
    colorHex: 0x4ad8ff,
    emissiveHex: 0x1d7dfa,
    arcHeight: 2.0,
    buoyantLift: 0.0,
  },
  rune_pod: {
    id: "rune_pod",
    symbol: "+x",
    colorHex: 0x34d399,
    emissiveHex: 0x10b981,
    arcHeight: 2.4,
    buoyantLift: 0.0,
  },
  helium_puff: {
    id: "helium_puff",
    symbol: "-x",
    colorHex: 0xc084fc,
    emissiveHex: 0x9333ea,
    arcHeight: 3.6,
    buoyantLift: 1.15,
  },
};

export function normalizeMountId(rawId) {
  if (rawId === "starlight_glider" || rawId === "glide_cape" || rawId === "moon_stag") {
    return "starlight_glider";
  }
  if (rawId === "bramble_boar" || rawId === "boar" || rawId === "terra_dozer") {
    return "bramble_boar";
  }
  return "bramble_boar";
}

export class OddrootWorld3D {
  constructor(options = {}) {
    const safeOptions = options && typeof options === "object" ? options : {};
    const {
      canvas = null,
      audio = null,
      onWorldActivity = null,
      onSnowCleared = null,
      onOrbHarvested = null,
      onApproachGate = null,
      onApproachShrine = null,
      onLeaveGate = null,
      onLeaveShrine = null,
      onMysteryFound = null,
      onCreatureHatched = null,
      onGaragePadEntered = null,
      onWorkshopPadEntered = null,
      onOppositionEvent = null,
      onSanctuaryEvent = null,
      onSharedCoinGrabbed = null,
      reducedMotion = null,
    } = safeOptions;

    this.canvas = canvas;
    this.audio = audio;

    const worldActivityCb = onWorldActivity || onSnowCleared || onOrbHarvested || null;
    this.onWorldActivity = (amount, bonusFlux = 0, metricKey = "sanctuaryActivity") => {
      if (typeof worldActivityCb === "function") {
        worldActivityCb(amount, bonusFlux, metricKey);
      }
    };
    const approachCb = onApproachGate || onApproachShrine || null;
    this.onApproachGate = (enc, slot) => {
      if (typeof approachCb === "function") {
        approachCb(enc, slot);
      }
    };
    const leaveCb = onLeaveGate || onLeaveShrine || null;
    this.onLeaveGate = () => {
      if (typeof leaveCb === "function") {
        leaveCb();
      }
    };
    this.onMysteryFound = typeof onMysteryFound === "function" ? onMysteryFound : () => {};
    this.onCreatureHatched = typeof onCreatureHatched === "function" ? onCreatureHatched : () => {};
    const garageCb = onGaragePadEntered || onWorkshopPadEntered || null;
    this.onGaragePadEntered = () => {
      if (typeof garageCb === "function") {
        garageCb();
      }
    };
    const oppCb = onOppositionEvent || onSanctuaryEvent || null;
    this.onOppositionEvent = (evt) => {
      if (typeof oppCb === "function") {
        oppCb(evt);
      }
    };
    this.onSharedCoinGrabbed =
      typeof onSharedCoinGrabbed === "function" ? onSharedCoinGrabbed : () => {};

    this.running = false;
    this.webglAvailable = false;
    this.renderer = null;
    this.clock = new THREE.Clock();
    this.elapsedTime = 0;
    this._rafId = null;

    this.reducedMotion =
      reducedMotion !== null
        ? Boolean(reducedMotion)
        : typeof window !== "undefined" &&
          typeof window.matchMedia === "function" &&
          Boolean(window.matchMedia("(prefers-reduced-motion: reduce)")?.matches);

    this.encounterDockOpen = false;
    this._gateAutoPause = false;

    this.dprGovernor = {
      minDpr: 0.85,
      maxDpr: 1.5,
      currentDpr: 1.0,
      emaFrameMs: 16.6,
      highLoadSec: 0,
      lowLoadSec: 0,
      cooldownSec: 0,
    };

    this.rigState = {
      x: 0,
      y: 0.95,
      z: 22,
      vy: 0,
      heading: 0,
      speed: 0,
      steerInput: 0,
      throttleInput: 0,
      boosting: false,
      mountId: "starlight_glider",
      chassisId: "starlight_glider",
      rawMountVariant: "starlight_glider",
      equippedStaff: "crescent_siphon",
      upgrades: [],
      upgradesSet: new Set(),
      crossRealmUnlocks: {},
      borrowedToy: null,
      observatoryTier: 1,
      inSurge: false,
      inBlight: false,
      glidingAirborne: false,
      siphonOrbs: {
        pos: 6,
        neg: 6,
        varPos: 2,
        varNeg: 2,
        sun_orb: 6,
        frost_spore: 6,
        rune_pod: 2,
        helium_puff: 2,
      },
      mosaicForged: false,
    };
    this.avatarState = this.rigState;

    this.autopilotTarget = null;
    this.activeGateSlot = null;
    this.dialPreviewValue = 0;
    this.moonDwellSec = 0;
    this._moonMysterySent = false;
    this._inWorkshopPad = false;
    this._offEdgeSec = 0;
    this._chasmGlideTimer = 0;
    this._skyrootLiftTimer = 0;

    this.bulletTimeRequested = false;
    this._lastSimDt = 1 / 60;
    this.simTimeState = computeSimulationTimeScale({
      dt: 1 / 60,
      encounterDockOpen: false,
      activeGateSlot: false,
      bulletTimeRequested: false,
      realmId: "oddroot",
    });
    this.fieldExpedition = createFieldExpeditionState("oddroot", 0);

    this.grottoLagoonPools = [];
    this.grottoSporeCaps = [];
    this.skyrootWindRings = [];
    this.expeditionBeacons = [];
    this.expeditionBurstMesh = null;
    this._expeditionBurstTimer = 0;
    this.clockworkCharm = null;
    this.clockworkCharmOuter = null;
    this.clockworkCharmInner = null;

    this.rigAnim = null;
    this.guardianAnim = null;
    this.whaleTimer = 0;

    this._boundProgressRef = null;
    this.ghostBest = null;
    this.currentRunFrames = [];
    this.waveElapsedSec = 0;
    this._ghostRecordAccum = 0;
    this._waveCompletionChecked = false;

    this.sporeLilies = [];
    this.sporeLilyCursor = 0;
    this.activeSporeLilyCount = 0;
    this._sporeWakeDistAccum = 0;
    this._lastWakeX = this.rigState.x;
    this._lastWakeZ = this.rigState.z;

    this._tmpVecA = new THREE.Vector3();
    this._tmpVecB = new THREE.Vector3();
    this._tmpObj = new THREE.Object3D();

    this._initScene();
  }

  _sampleArchipelago(x, z) {
    let bestGroundY = -Infinity;
    let onGround = false;

    for (const isl of SANCTUARY_ISLANDS) {
      const d = Math.hypot(x - isl.x, z - isl.z);
      if (d <= isl.radius + 0.75) {
        onGround = true;
        if (isl.topY > bestGroundY) {
          bestGroundY = isl.topY;
        }
      }
    }

    for (const br of SANCTUARY_BRIDGES) {
      const abx = br.bx - br.ax;
      const abz = br.bz - br.az;
      const lenSq = abx * abx + abz * abz || 1;
      const t = Math.max(0, Math.min(1, ((x - br.ax) * abx + (z - br.az) * abz) / lenSq));
      const cx = br.ax + abx * t;
      const cz = br.az + abz * t;
      const dist = Math.hypot(x - cx, z - cz);
      if (dist <= br.width * 0.5 + 0.6) {
        onGround = true;
        const by = br.ay + (br.by - br.ay) * t;
        if (by > bestGroundY) {
          bestGroundY = by;
        }
      }
    }

    let nearestIsl = SANCTUARY_ISLANDS[0];
    let minEdgeDist = Infinity;
    for (const isl of SANCTUARY_ISLANDS) {
      const d = Math.hypot(x - isl.x, z - isl.z) - isl.radius;
      if (d < minEdgeDist) {
        minEdgeDist = d;
        nearestIsl = isl;
      }
    }

    const dx = x - nearestIsl.x;
    const dz = z - nearestIsl.z;
    const dLen = Math.hypot(dx, dz);
    const clampR = nearestIsl.radius * 0.8;
    const safeX = dLen > 0.01 ? nearestIsl.x + (dx / dLen) * Math.min(dLen, clampR) : nearestIsl.x;
    const safeZ = dLen > 0.01 ? nearestIsl.z + (dz / dLen) * Math.min(dLen, clampR) : nearestIsl.z;

    return {
      onGround,
      groundY: onGround ? bestGroundY : nearestIsl.topY,
      safeX,
      safeZ,
      safeY: nearestIsl.topY,
    };
  }

  _groundHeightAt(x, z) {
    return this._sampleArchipelago(x, z).groundY;
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x091c26);
    this.scene.fog = new THREE.FogExp2(0x0d2633, 0.0052);

    this.baseFov = 55;
    this.camera = new THREE.PerspectiveCamera(this.baseFov, 16 / 9, 0.4, 420);
    this.camera.position.set(0, 11.5, 36);
    this.camera.lookAt(0, 3.05, 15.5);
    this.camera.updateMatrixWorld();

    // Probe WebGL context cleanly without noisy stderr when gl === null in headless Node
    try {
      let gl = null;
      if (this.canvas && typeof this.canvas.getContext === "function") {
        const attrs = { alpha: false, antialias: true, powerPreference: "high-performance" };
        gl = this.canvas.getContext("webgl2", attrs) || this.canvas.getContext("webgl", attrs);
      }
      if (gl) {
        this.renderer = new THREE.WebGLRenderer({
          canvas: this.canvas,
          context: gl,
          antialias: true,
          powerPreference: "high-performance",
        });
        const rawDpr =
          typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
        this.dprGovernor.maxDpr = Math.max(0.85, Math.min(2.0, rawDpr));
        this.dprGovernor.currentDpr = this.dprGovernor.maxDpr;
        this.renderer.setPixelRatio(this.dprGovernor.currentDpr);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.06;
        this.webglAvailable = true;
      } else {
        this.renderer = null;
        this.webglAvailable = false;
      }
    } catch (_) {
      this.renderer = null;
      this.webglAvailable = false;
    }

    // Unconditionally construct 100% of the Sanctuary 3D scene graph!
    this.toonGradientTex = createOddrootToonGradient();

    const hemi = new THREE.HemisphereLight(0xa8f5e8, 0x162b38, 1.24);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffe8b0, 1.58);
    sun.position.set(34, 58, 28);
    this.scene.add(sun);

    const rimFill = new THREE.DirectionalLight(0x38f2c8, 0.68);
    rimFill.position.set(-38, 32, -48);
    this.scene.add(rimFill);

    this._buildCelestialAtmosphere();
    this._buildSanctuaryArchipelago();
    this._buildOuterArchipelagoBiomes();
    this._buildExpeditionBeacons();
    this._buildWorldTreeMoonwellAndObservatory();
    this._buildHarvestableThickets();
    this._buildSiphonProjectilePool();
    this._buildSporeLilyPool();
    this._buildSkyWhaleAndGhost();

    this.menagerie = new SanctuaryMenagerie3D({
      scene: this.scene,
      toonGradientMap: this.toonGradientTex,
      sampleGroundY: (x, z) => this._groundHeightAt(x, z),
    });

    this.blightSystem = new BlightOppositionSystem({
      scene: this.scene,
      toonGradientMap: this.toonGradientTex,
      sampleGroundY: (x, z) => this._groundHeightAt(x, z),
    });
    this.blightPatches = this.blightSystem.thornPatches;
    this.gloomClouds = this.blightSystem.gloomSpores;

    this.shrines = new OddrootShrineManager({
      scene: this.scene,
      audio: this.audio,
      toonGradientMap: this.toonGradientTex,
      getTerrainHeight: (x, z) => this._groundHeightAt(x, z),
    });
    this.gateSlots = this.shrines.slots;
    this.shrineSlots = this.shrines.slots;

    this.coop = new OddrootCoopManager({
      scene: this.scene,
      audio: this.audio,
      toonGradientMap: this.toonGradientTex,
      sampleGroundY: (x, z) => this._groundHeightAt(x, z),
      onSharedCoinGrabbed: (coinId) => this.onSharedCoinGrabbed(coinId),
    });

    this.slipstreamVfx = new SlipstreamBoostVFXController({
      scene: this.scene,
      theme: "oddroot",
    });
    this.horizonWonder = new HorizonWonderAndRelicSystem({
      scene: this.scene,
      theme: "oddroot",
      archPosition: { x: 0, y: 10.5, z: -48 },
    });

    this.rebuildAvatar(this.rigState.mountId, this.rigState.upgrades);
    this.setObservatoryTier(1);
    this.resize();

    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      this._onResize = () => this.resize();
      window.addEventListener("resize", this._onResize);
    }
  }

  _buildCelestialAtmosphere() {
    // 1. Celestial Twilight Sky Dome
    this.skyDome = buildCelestialSkyDome({ theme: "oddroot", radius: 228 });
    this.scene.add(this.skyDome);

    // 2. Three Undulating Additive Bioluminescent Aurora Ribbons High Overhead
    this.auroraRibbons = [];
    const ribbonSpecs = [
      { baseX: -18, baseY: 46, zStart: 42, zEnd: -108, height: 8.5, phase: 0.0, colA: 0x3bf0c5, colB: 0x7ee081 },
      { baseX: 4, baseY: 53, zStart: 36, zEnd: -116, height: 10.2, phase: 2.1, colA: 0x62f5e4, colB: 0xffd166 },
      { baseX: 22, baseY: 49, zStart: 30, zEnd: -102, height: 8.0, phase: 4.2, colA: 0xc084fc, colB: 0x3bf0c5 },
    ];

    const segs = 32;
    for (let r = 0; r < ribbonSpecs.length; r++) {
      const spec = ribbonSpecs[r];
      const vertCount = (segs + 1) * 2;
      const positions = new Float32Array(vertCount * 3);
      const baseU = new Float32Array(segs + 1);
      const colors = new Float32Array(vertCount * 3);
      const indices = [];

      const cA = new THREE.Color(spec.colA);
      const cB = new THREE.Color(spec.colB);
      const cMix = new THREE.Color();

      for (let i = 0; i <= segs; i++) {
        const u = i / segs;
        baseU[i] = u;
        const z = spec.zStart + (spec.zEnd - spec.zStart) * u;
        const curveX = spec.baseX + Math.sin(u * Math.PI * 2.2 + spec.phase) * 18.0;
        const archY = spec.baseY + Math.sin(u * Math.PI) * 7.5;
        const fade = Math.sin(u * Math.PI);

        const idxBot = i * 2;
        const idxTop = i * 2 + 1;

        positions[idxBot * 3] = curveX;
        positions[idxBot * 3 + 1] = archY;
        positions[idxBot * 3 + 2] = z;

        positions[idxTop * 3] = curveX + 2.2;
        positions[idxTop * 3 + 1] = archY + spec.height * (0.45 + 0.55 * fade);
        positions[idxTop * 3 + 2] = z;

        cMix.copy(cA).lerp(cB, u);
        colors[idxBot * 3] = cMix.r * fade;
        colors[idxBot * 3 + 1] = cMix.g * fade;
        colors[idxBot * 3 + 2] = cMix.b * fade;

        colors[idxTop * 3] = cMix.r * fade * 0.35;
        colors[idxTop * 3 + 1] = cMix.g * fade * 0.45;
        colors[idxTop * 3 + 2] = cMix.b * fade * 0.5;

        if (i < segs) {
          const a = i * 2;
          const b = a + 1;
          const c = a + 2;
          const d = a + 3;
          indices.push(a, c, b, b, c, d);
        }
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      geo.setIndex(indices);

      const mat = new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.34,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = `BioluminescentAuroraRibbon_${r}`;
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      this.auroraRibbons.push({ mesh, geo, spec, segs, baseU });
    }

    // 3. Drifting 220 Soft-Sprite Firefly Motes Across the Sanctuary Islands
    const fireflyCount = 220;
    const ffPositions = new Float32Array(fireflyCount * 3);
    const ffColors = new Float32Array(fireflyCount * 3);
    this._fireflyBaseX = new Float32Array(fireflyCount);
    this._fireflyBaseY = new Float32Array(fireflyCount);
    this._fireflyBaseZ = new Float32Array(fireflyCount);
    this._fireflyPhase = new Float32Array(fireflyCount);

    const ffPalette = [
      new THREE.Color(0xffd166),
      new THREE.Color(0x62f5e4),
      new THREE.Color(0x7ee081),
      new THREE.Color(0xe0b0ff),
    ];

    for (let i = 0; i < fireflyCount; i++) {
      const isl = SANCTUARY_ISLANDS[i % SANCTUARY_ISLANDS.length];
      const ang = (i * 2.399963) % (Math.PI * 2);
      const radialFrac = 0.22 + ((i * 0.618034) % 0.86);
      const rad = isl.radius * radialFrac;
      const bx = isl.x + Math.cos(ang) * rad;
      const bz = isl.z + Math.sin(ang) * rad;
      const by = isl.topY + 0.9 + ((i * 1.37) % 5.6);

      this._fireflyBaseX[i] = bx;
      this._fireflyBaseY[i] = by;
      this._fireflyBaseZ[i] = bz;
      this._fireflyPhase[i] = (i * 0.83) % (Math.PI * 2);

      ffPositions[i * 3] = bx;
      ffPositions[i * 3 + 1] = by;
      ffPositions[i * 3 + 2] = bz;

      const col = ffPalette[i % ffPalette.length];
      ffColors[i * 3] = col.r;
      ffColors[i * 3 + 1] = col.g;
      ffColors[i * 3 + 2] = col.b;
    }

    const ffGeo = new THREE.BufferGeometry();
    ffGeo.setAttribute("position", new THREE.BufferAttribute(ffPositions, 3));
    ffGeo.setAttribute("color", new THREE.BufferAttribute(ffColors, 3));

    const ffMat = new THREE.PointsMaterial({
      size: 0.95,
      map: createSoftGlowTexture(),
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.fireflyPoints = new THREE.Points(ffGeo, ffMat);
    this.fireflyPoints.name = "SanctuaryFireflyMotes";
    this.fireflyPoints.frustumCulled = false;
    this.scene.add(this.fireflyPoints);

    // 4. Luminous Cloud-Sea Mist Rings Below the Floating Archipelago
    this.cloudMistRings = [];
    const mistSpecs = [
      { innerR: 16, outerR: 42, y: -5.4, z: -12, col: 0x3bf0c5, op: 0.16, speed: 0.045 },
      { innerR: 34, outerR: 68, y: -10.2, z: -16, col: 0x2dd4bf, op: 0.13, speed: -0.032 },
      { innerR: 52, outerR: 96, y: -15.6, z: -18, col: 0x38bdf8, op: 0.11, speed: 0.024 },
      { innerR: 22, outerR: 84, y: -21.5, z: -16, col: 0x818cf8, op: 0.09, speed: -0.018 },
    ];
    for (let m = 0; m < mistSpecs.length; m++) {
      const ms = mistSpecs[m];
      const mMat = new THREE.MeshBasicMaterial({
        color: ms.col,
        transparent: true,
        opacity: ms.op,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(new THREE.RingGeometry(ms.innerR, ms.outerR, 44), mMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(0, ms.y, ms.z);
      ring.name = `CloudSeaMistRing_${m}`;
      this.scene.add(ring);
      this.cloudMistRings.push({ mesh: ring, mat: mMat, baseOpacity: ms.op, speed: ms.speed });
    }
  }

  _stepCelestialAtmosphere(dt) {
    const t = this.elapsedTime;

    if (this.auroraRibbons) {
      for (const ar of this.auroraRibbons) {
        const posAttr = ar.geo.getAttribute("position");
        const arr = posAttr.array;
        const { spec, segs, baseU } = ar;
        for (let i = 0; i <= segs; i++) {
          const u = baseU[i];
          const fade = Math.sin(u * Math.PI);
          const waveX =
            spec.baseX +
            Math.sin(u * Math.PI * 2.2 + spec.phase + t * 0.42) * 18.0 +
            Math.cos(u * Math.PI * 4.0 - t * 0.65) * 3.4;
          const waveY =
            spec.baseY +
            Math.sin(u * Math.PI) * 7.5 +
            Math.sin(u * Math.PI * 3.0 + t * 0.55 + spec.phase) * 1.8;

          const idxBot = i * 6;
          const idxTop = idxBot + 3;
          arr[idxBot] = waveX;
          arr[idxBot + 1] = waveY;
          arr[idxTop] = waveX + 2.2 + Math.sin(t * 0.7 + u * 5.0) * 1.1;
          arr[idxTop + 1] = waveY + spec.height * (0.45 + 0.55 * fade);
        }
        posAttr.needsUpdate = true;
      }
    }

    if (this.fireflyPoints) {
      const posAttr = this.fireflyPoints.geometry.getAttribute("position");
      const arr = posAttr.array;
      const n = this._fireflyPhase.length;
      for (let i = 0; i < n; i++) {
        const ph = this._fireflyPhase[i];
        const j = i * 3;
        arr[j] = this._fireflyBaseX[i] + Math.sin(t * 0.68 + ph) * 0.85;
        arr[j + 1] = this._fireflyBaseY[i] + Math.sin(t * 1.45 + ph * 1.7) * 0.52;
        arr[j + 2] = this._fireflyBaseZ[i] + Math.cos(t * 0.62 + ph * 1.3) * 0.85;
      }
      posAttr.needsUpdate = true;
    }

    if (this.cloudMistRings) {
      for (let i = 0; i < this.cloudMistRings.length; i++) {
        const mr = this.cloudMistRings[i];
        mr.mesh.rotation.z = t * mr.speed;
        mr.mat.opacity = mr.baseOpacity * (0.82 + 0.18 * Math.sin(t * 0.9 + i * 1.4));
      }
    }

    if (this.waterfallFoamRings) {
      for (let i = 0; i < this.waterfallFoamRings.length; i++) {
        const wf = this.waterfallFoamRings[i];
        const pulse = 0.92 + 0.14 * Math.sin(t * 3.4 + i * 1.1);
        wf.mesh.scale.setScalar(pulse);
        wf.mesh.rotation.z = t * (i % 2 === 0 ? 0.55 : -0.45);
      }
    }

    if (this.bridgeLanternPivots) {
      for (let i = 0; i < this.bridgeLanternPivots.length; i++) {
        const lp = this.bridgeLanternPivots[i];
        lp.rotation.z = Math.sin(t * 1.85 + i * 0.9) * 0.09;
        lp.rotation.x = Math.cos(t * 1.35 + i * 0.7) * 0.06;
      }
    }

    if (this.worldTreeLanternVines) {
      for (let i = 0; i < this.worldTreeLanternVines.length; i++) {
        const lv = this.worldTreeLanternVines[i];
        lv.rotation.z = Math.sin(t * 1.4 + i * 1.1) * 0.07;
        lv.rotation.x = Math.cos(t * 1.15 + i * 0.8) * 0.05;
      }
    }

    if (this.crystalFernInst && this._fernInstances) {
      for (let i = 0; i < this._fernInstances.length; i++) {
        const f = this._fernInstances[i];
        const sway = Math.sin(t * 2.1 + f.phase) * 0.11;
        this._tmpObj.position.set(f.x, f.y, f.z);
        this._tmpObj.rotation.set(f.tiltX + sway, f.rotY, sway * 0.6);
        this._tmpObj.scale.set(f.scale, f.scale * 1.15, f.scale * 0.45);
        this._tmpObj.updateMatrix();
        this.crystalFernInst.setMatrixAt(i, this._tmpObj.matrix);
      }
      this.crystalFernInst.instanceMatrix.needsUpdate = true;
    }
  }

  _isClearPerimeterSpot(wx, wz) {
    if (Math.hypot(wx, wz - 22) < 4.5) return false;
    if (Math.hypot(wx - WORKSHOP_PAD_COORD.x, wz - WORKSHOP_PAD_COORD.z) < 4.8) return false;
    for (const sh of SHRINE_ANCHORS) {
      if (Math.hypot(wx - sh.x, wz - sh.z) < 6.0) return false;
    }
    for (const br of SANCTUARY_BRIDGES) {
      const mx = (br.ax + br.bx) * 0.5;
      const mz = (br.az + br.bz) * 0.5;
      if (
        Math.hypot(wx - br.ax, wz - br.az) < 4.2 ||
        Math.hypot(wx - br.bx, wz - br.bz) < 4.2 ||
        Math.hypot(wx - mx, wz - mz) < 4.0
      ) {
        return false;
      }
    }
    return true;
  }

  _buildSanctuaryArchipelago() {
    this.archipelagoGroup = new THREE.Group();
    this.archipelagoGroup.name = "SanctuaryArchipelago";
    this.scene.add(this.archipelagoGroup);

    const mossTopMat = createOddrootToonRimMaterial(this.toonGradientTex, {
      color: 0x1e5c4e,
      emissive: 0x0b2e26,
      emissiveIntensity: 0.3,
      rimColor: 0x62f5e4,
      rimIntensity: 0.36,
    });
    const mossLedgeMat = createOddrootToonRimMaterial(this.toonGradientTex, {
      color: 0x26705d,
      emissive: 0x0f3b31,
      emissiveIntensity: 0.34,
      rimColor: 0x7ee081,
      rimIntensity: 0.42,
    });
    const cliffUndersideMat = createOddrootToonRimMaterial(this.toonGradientTex, {
      color: 0x2c3646,
      emissive: 0x101824,
      emissiveIntensity: 0.2,
      rimColor: 0x38bdf8,
      rimIntensity: 0.28,
    });
    const rootCrystalCyanMat = createOddrootToonRimMaterial(this.toonGradientTex, {
      color: 0x4de8dd,
      emissive: 0x14b8a6,
      emissiveIntensity: 0.78,
      rimColor: 0xffffff,
      rimIntensity: 0.65,
    });
    const rootCrystalAmberMat = createOddrootToonRimMaterial(this.toonGradientTex, {
      color: 0xffd166,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.76,
      rimColor: 0xfff8dc,
      rimIntensity: 0.6,
    });
    const bridgePlankMat = createOddrootToonRimMaterial(this.toonGradientTex, {
      color: 0x855a34,
      emissive: 0x2c1a0a,
      emissiveIntensity: 0.28,
      rimColor: 0xffd166,
      rimIntensity: 0.42,
    });
    const bridgeArchStoneMat = createOddrootToonRimMaterial(this.toonGradientTex, {
      color: 0x355c54,
      emissive: 0x102a25,
      emissiveIntensity: 0.26,
      rimColor: 0x62f5e4,
      rimIntensity: 0.38,
    });
    const brassTrimMat = createOddrootToonRimMaterial(this.toonGradientTex, {
      color: 0xd9a036,
      emissive: 0x4f3409,
      emissiveIntensity: 0.32,
      rimColor: 0xffe49c,
      rimIntensity: 0.48,
    });
    const warmLanternMat = createOddrootToonRimMaterial(this.toonGradientTex, {
      color: 0xffe599,
      emissive: 0xff9f1c,
      emissiveIntensity: 0.92,
      rimColor: 0xffffff,
      rimIntensity: 0.7,
    });
    const waterfallMat = new THREE.MeshBasicMaterial({
      color: 0x62f5e4,
      transparent: true,
      opacity: 0.58,
      side: THREE.DoubleSide,
    });
    const foamMat = new THREE.MeshBasicMaterial({
      color: 0xb8fff6,
      transparent: true,
      opacity: 0.48,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const mushroomEntries = [];
    this._fernInstances = [];

    const crystalStalactiteGeo = new THREE.ConeGeometry(0.42, 2.35, 6);
    crystalStalactiteGeo.rotateX(Math.PI);
    const rimLedgeStoneGeo = new THREE.CylinderGeometry(1.35, 1.55, 0.46, 7);

    for (let idx = 0; idx < SANCTUARY_ISLANDS.length; idx++) {
      const isl = SANCTUARY_ISLANDS[idx];
      const islGrp = new THREE.Group();
      islGrp.name = `Island_${isl.id}`;
      islGrp.position.set(isl.x, isl.topY, isl.z);

      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(isl.radius, isl.radius * 0.95, 1.2, 32),
        mossTopMat
      );
      cap.position.y = -0.6;
      islGrp.add(cap);

      // Stepped mossy rim ledges & cliff strata bands around the island edge
      const upperMossStep = new THREE.Mesh(
        new THREE.CylinderGeometry(isl.radius + 0.52, isl.radius + 0.16, 0.52, 32),
        mossLedgeMat
      );
      upperMossStep.position.y = -0.48;
      islGrp.add(upperMossStep);

      const lowerRockShelf = new THREE.Mesh(
        new THREE.CylinderGeometry(isl.radius * 0.99, isl.radius * 0.87, 0.95, 24),
        cliffUndersideMat
      );
      lowerRockShelf.position.y = -1.32;
      islGrp.add(lowerRockShelf);

      const rootCone = new THREE.Mesh(
        new THREE.ConeGeometry(isl.radius * 0.86, isl.radius * 0.74, 18),
        cliffUndersideMat
      );
      rootCone.rotation.x = Math.PI;
      rootCone.position.y = -1.55 - isl.radius * 0.36;
      islGrp.add(rootCone);

      // Hanging glowing root-crystals & root tendrils underneath each floating island
      const apexDepthY = -1.55 - isl.radius * 0.73;
      const coreCrystal = new THREE.Mesh(
        crystalStalactiteGeo,
        idx % 2 === 0 ? rootCrystalCyanMat : rootCrystalAmberMat
      );
      coreCrystal.scale.set(1.45, 1.35, 1.45);
      coreCrystal.position.set(0, apexDepthY - 0.55, 0);
      islGrp.add(coreCrystal);

      for (let c = 0; c < 6; c++) {
        const cAng = (c / 6) * Math.PI * 2 + idx * 0.4;
        const cRad = isl.radius * (0.44 + (c % 2) * 0.18);
        const hangY = -2.1 - isl.radius * (0.24 + (c % 2) * 0.12);
        const shard = new THREE.Mesh(
          crystalStalactiteGeo,
          c % 3 === 0 ? rootCrystalAmberMat : rootCrystalCyanMat
        );
        shard.scale.setScalar(0.68 + (c % 3) * 0.22);
        shard.position.set(Math.cos(cAng) * cRad, hangY, Math.sin(cAng) * cRad);
        shard.rotation.z = Math.cos(cAng) * 0.14;
        shard.rotation.x = Math.sin(cAng) * 0.14;
        islGrp.add(shard);

        const rootTendril = new THREE.Mesh(
          new THREE.TorusGeometry(1.25, 0.14, 6, 14, Math.PI * 0.72),
          cliffUndersideMat
        );
        rootTendril.position.set(Math.cos(cAng) * (cRad * 1.12), -1.85, Math.sin(cAng) * (cRad * 1.12));
        rootTendril.rotation.y = -cAng;
        islGrp.add(rootTendril);
      }

      // Perimeter moss ledges, Bioluminescent Sanctuary Mushrooms & Crystal Ferns (clear of paths!)
      const perimSlots = 12;
      for (let p = 0; p < perimSlots; p++) {
        const pAng = (p / perimSlots) * Math.PI * 2 + idx * 0.31;
        const rimR = isl.radius - 1.05;
        const wx = isl.x + Math.cos(pAng) * rimR;
        const wz = isl.z + Math.sin(pAng) * rimR;
        if (!this._isClearPerimeterSpot(wx, wz)) continue;

        if (p % 2 === 0) {
          const ledge = new THREE.Mesh(rimLedgeStoneGeo, mossLedgeMat);
          ledge.position.set(Math.cos(pAng) * (isl.radius + 0.15), -0.22, Math.sin(pAng) * (isl.radius + 0.15));
          ledge.rotation.y = pAng;
          islGrp.add(ledge);
        }

        if (p % 3 !== 2) {
          // Trio cluster of Bioluminescent Sanctuary Mushrooms
          for (let m = 0; m < 3; m++) {
            const subAng = pAng + (m - 1) * 0.42;
            const subDist = m === 0 ? 0 : 0.48 + m * 0.12;
            mushroomEntries.push({
              x: wx + Math.cos(subAng) * subDist,
              y: isl.topY,
              z: wz + Math.sin(subAng) * subDist,
              scale: m === 0 ? 1.05 : m === 1 ? 0.74 : 0.52,
              tiltZ: (m - 1) * 0.12,
              rotY: subAng * 1.7,
              colorIdx: (idx + p + m) % 4,
            });
          }
        } else {
          // Rosette of 5 swaying Crystal Fern fronds
          for (let f = 0; f < 5; f++) {
            const fAng = (f / 5) * Math.PI * 2 + pAng;
            this._fernInstances.push({
              x: wx + Math.cos(fAng) * 0.18,
              y: isl.topY + 0.36,
              z: wz + Math.sin(fAng) * 0.18,
              rotY: fAng,
              tiltX: 0.48 + (f % 2) * 0.14,
              scale: 0.82 + (f % 3) * 0.16,
              phase: p * 0.7 + f * 0.5 + idx,
            });
          }
        }
      }

      this.archipelagoGroup.add(islGrp);
    }

    // Batched Bioluminescent Sanctuary Mushrooms (stems + glowing caps)
    if (mushroomEntries.length > 0) {
      const stemGeo = new THREE.CylinderGeometry(0.08, 0.13, 0.62, 8);
      stemGeo.translate(0, 0.31, 0);
      const capGeo = new THREE.ConeGeometry(0.42, 0.34, 12);
      capGeo.translate(0, 0.7, 0);

      const stemMat = createOddrootToonRimMaterial(this.toonGradientTex, {
        color: 0xe8f5ee,
        emissive: 0x2b594e,
        emissiveIntensity: 0.38,
      });
      const capMat = createOddrootToonRimMaterial(this.toonGradientTex, {
        color: 0xffffff,
        emissive: 0x3bf0c5,
        emissiveIntensity: 0.74,
        rimColor: 0xffd166,
        rimIntensity: 0.62,
      });

      const stemInst = new THREE.InstancedMesh(stemGeo, stemMat, mushroomEntries.length);
      const capInst = new THREE.InstancedMesh(capGeo, capMat, mushroomEntries.length);
      const mushPalette = [
        new THREE.Color(0x3bf0c5),
        new THREE.Color(0xc084fc),
        new THREE.Color(0xffd166),
        new THREE.Color(0x62f5e4),
      ];

      for (let i = 0; i < mushroomEntries.length; i++) {
        const m = mushroomEntries[i];
        this._tmpObj.position.set(m.x, m.y, m.z);
        this._tmpObj.rotation.set(0, m.rotY, m.tiltZ);
        this._tmpObj.scale.setScalar(m.scale);
        this._tmpObj.updateMatrix();
        stemInst.setMatrixAt(i, this._tmpObj.matrix);
        capInst.setMatrixAt(i, this._tmpObj.matrix);
        capInst.setColorAt(i, mushPalette[m.colorIdx]);
      }
      stemInst.instanceMatrix.needsUpdate = true;
      capInst.instanceMatrix.needsUpdate = true;
      if (capInst.instanceColor) capInst.instanceColor.needsUpdate = true;
      this.archipelagoGroup.add(stemInst, capInst);
      this.sanctuaryMushroomCaps = capInst;
    }

    // Batched Swaying Crystal Ferns
    if (this._fernInstances.length > 0) {
      const fernGeo = new THREE.ConeGeometry(0.24, 0.92, 5);
      fernGeo.translate(0, 0.42, 0);
      const fernMat = createOddrootToonRimMaterial(this.toonGradientTex, {
        color: 0x4de8dd,
        emissive: 0x10b981,
        emissiveIntensity: 0.58,
        rimColor: 0xffe599,
        rimIntensity: 0.52,
      });
      this.crystalFernInst = new THREE.InstancedMesh(
        fernGeo,
        fernMat,
        this._fernInstances.length
      );
      for (let i = 0; i < this._fernInstances.length; i++) {
        const f = this._fernInstances[i];
        this._tmpObj.position.set(f.x, f.y, f.z);
        this._tmpObj.rotation.set(f.tiltX, f.rotY, 0);
        this._tmpObj.scale.set(f.scale, f.scale * 1.15, f.scale * 0.45);
        this._tmpObj.updateMatrix();
        this.crystalFernInst.setMatrixAt(i, this._tmpObj.matrix);
      }
      this.crystalFernInst.instanceMatrix.needsUpdate = true;
      this.archipelagoGroup.add(this.crystalFernInst);
    }

    // Sanctuary Bridges with Carved Overhead Arches & Hanging Warm Lanterns
    this.bridgeLanternPivots = [];
    const lanternCapGeo = new THREE.ConeGeometry(0.22, 0.18, 8);
    const lanternOrbGeo = new THREE.SphereGeometry(0.18, 10, 8);
    const lanternChainGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.48, 6);

    for (let bIdx = 0; bIdx < SANCTUARY_BRIDGES.length; bIdx++) {
      const br = SANCTUARY_BRIDGES[bIdx];
      const dx = br.bx - br.ax;
      const dy = br.by - br.ay;
      const dz = br.bz - br.az;
      const len = Math.hypot(dx, dy, dz) || 1;
      const midX = (br.ax + br.bx) * 0.5;
      const midY = (br.ay + br.by) * 0.5;
      const midZ = (br.az + br.bz) * 0.5;
      const yaw = Math.atan2(dx, dz);
      const pitch = -Math.asin(Math.max(-0.8, Math.min(0.8, dy / len)));

      const bridgeGrp = new THREE.Group();
      bridgeGrp.name = `SanctuaryBridge_${bIdx}`;
      bridgeGrp.position.set(midX, midY, midZ);
      bridgeGrp.rotation.y = yaw;

      const deckGrp = new THREE.Group();
      deckGrp.rotation.x = pitch;

      const deck = new THREE.Mesh(
        new THREE.BoxGeometry(br.width, 0.24, len + 1.4),
        bridgePlankMat
      );
      deck.position.y = -0.1;
      deckGrp.add(deck);

      // Low carved timber-and-moss side curbs
      for (const sx of [-1, 1]) {
        const curb = new THREE.Mesh(
          new THREE.BoxGeometry(0.24, 0.26, len + 1.2),
          bridgeArchStoneMat
        );
        curb.position.set(sx * (br.width * 0.5 + 0.08), 0.12, 0);
        deckGrp.add(curb);
      }
      bridgeGrp.add(deckGrp);

      // Carved Sanctuary Bridge Arch + Hanging Warm Lanterns (high clearance >= 4.2m)
      const archHalfSpan = br.width * 0.5 + 0.28;
      const postHeight = 3.7;
      for (const sx of [-1, 1]) {
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2, 0.28, postHeight, 8),
          bridgeArchStoneMat
        );
        post.position.set(sx * archHalfSpan, postHeight * 0.5 - 0.1, 0);
        const cuff = new THREE.Mesh(
          new THREE.TorusGeometry(0.26, 0.05, 6, 14),
          brassTrimMat
        );
        cuff.rotation.x = Math.PI / 2;
        cuff.position.set(sx * archHalfSpan, postHeight - 0.22, 0);
        bridgeGrp.add(post, cuff);

        // Hanging warm amber lantern suspended from the upper arch shoulder
        const hangX = sx * (archHalfSpan * 0.72);
        const hangY =
          postHeight -
          0.15 +
          Math.sqrt(Math.max(0.1, archHalfSpan * archHalfSpan - hangX * hangX)) * 0.68;
        const lanternPivot = new THREE.Group();
        lanternPivot.position.set(hangX, hangY, 0);

        const chain = new THREE.Mesh(lanternChainGeo, brassTrimMat);
        chain.position.y = -0.24;
        const lCap = new THREE.Mesh(lanternCapGeo, brassTrimMat);
        lCap.position.y = -0.46;
        const lOrb = new THREE.Mesh(lanternOrbGeo, warmLanternMat);
        lOrb.position.y = -0.62;
        lanternPivot.add(chain, lCap, lOrb);

        bridgeGrp.add(lanternPivot);
        this.bridgeLanternPivots.push(lanternPivot);
      }

      const archSpanMesh = new THREE.Mesh(
        new THREE.TorusGeometry(archHalfSpan, 0.18, 8, 22, Math.PI),
        bridgeArchStoneMat
      );
      archSpanMesh.position.set(0, postHeight - 0.12, 0);
      archSpanMesh.scale.set(1, 0.72, 1);

      const archKeystone = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.28, 0),
        rootCrystalCyanMat
      );
      archKeystone.position.set(0, postHeight - 0.12 + archHalfSpan * 0.72 + 0.18, 0);
      bridgeGrp.add(archSpanMesh, archKeystone);

      this.archipelagoGroup.add(bridgeGrp);
    }

    // Glowing cascading waterfalls + plunge-foam rings on West, East & North cliffs
    this.waterfalls = [];
    this.waterfallFoamRings = [];
    for (const [wx, wy, wz] of [
      [-31, 1.2, -8],
      [31, 1.2, -8],
      [-7.5, 3.6, -54],
    ]) {
      const wf = new THREE.Mesh(
        new THREE.CylinderGeometry(1.1, 1.9, 14, 12, 1, true),
        waterfallMat
      );
      wf.position.set(wx, wy - 7.0, wz);
      this.archipelagoGroup.add(wf);
      this.waterfalls.push(wf);

      const crestRing = new THREE.Mesh(new THREE.RingGeometry(0.75, 1.55, 22), foamMat);
      crestRing.rotation.x = -Math.PI / 2;
      crestRing.position.set(wx, wy - 0.08, wz);

      const plungeInner = new THREE.Mesh(new THREE.RingGeometry(1.2, 2.75, 26), foamMat);
      plungeInner.rotation.x = -Math.PI / 2;
      plungeInner.position.set(wx, wy - 13.85, wz);

      const plungeOuter = new THREE.Mesh(new THREE.RingGeometry(2.6, 4.15, 28), foamMat);
      plungeOuter.rotation.x = -Math.PI / 2;
      plungeOuter.position.set(wx, wy - 13.92, wz);

      this.archipelagoGroup.add(crestRing, plungeInner, plungeOuter);
      this.waterfallFoamRings.push(
        { mesh: crestRing },
        { mesh: plungeInner },
        { mesh: plungeOuter }
      );
    }

    // Workshop / Sanctuary Altar Pad on South Terrace (-7.5, 0.42, 23.5)
    this.workshopPadGroup = new THREE.Group();
    this.workshopPadGroup.name = "SanctuaryWorkshopPad";
    this.workshopPadGroup.position.set(
      WORKSHOP_PAD_COORD.x,
      WORKSHOP_PAD_COORD.y,
      WORKSHOP_PAD_COORD.z
    );
    const altarBase = new THREE.Mesh(
      new THREE.CylinderGeometry(2.8, 3.1, 0.26, 20),
      createOddrootToonRimMaterial(this.toonGradientTex, {
        color: 0x2b594e,
        emissive: 0x134e4a,
        emissiveIntensity: 0.45,
        rimColor: 0xffd166,
        rimIntensity: 0.55,
      })
    );
    const altarRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.9, 0.14, 8, 28),
      createOddrootToonRimMaterial(this.toonGradientTex, {
        color: 0xffd166,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.72,
      })
    );
    altarRing.rotation.x = Math.PI / 2;
    altarRing.position.y = 0.16;
    this.workshopPadGroup.add(altarBase, altarRing);
    this.workshopPad = this.workshopPadGroup;
    this.garagePad = this.workshopPadGroup;
    this.scene.add(this.workshopPadGroup);
  }

  _buildOuterArchipelagoBiomes() {
    this.outerBiomesGroup = new THREE.Group();
    this.outerBiomesGroup.name = "OddrootOuterBiomes";
    this.scene.add(this.outerBiomesGroup);

    // 1. Sunken Starlight Grotto (-41, 10, topY = 0.8): glowing lagoon crystal pools, giant spore-caps & moss-crystal bridge trim
    const grottoGrp = new THREE.Group();
    grottoGrp.name = "SunkenStarlightGrotto";
    this.outerBiomesGroup.add(grottoGrp);

    const grottoStoneMat = createOddrootToonRimMaterial(this.toonGradientTex, {
      color: 0x26545c,
      emissive: 0x0f2f38,
      emissiveIntensity: 0.36,
      rimColor: 0x62f5e4,
      rimIntensity: 0.5,
    });
    const grottoCrystalCyanMat = createOddrootToonRimMaterial(this.toonGradientTex, {
      color: 0x62f5e4,
      emissive: 0x14b8a6,
      emissiveIntensity: 0.85,
      rimColor: 0xffffff,
      rimIntensity: 0.68,
    });
    const grottoCrystalVioletMat = createOddrootToonRimMaterial(this.toonGradientTex, {
      color: 0xc084fc,
      emissive: 0x7e22ce,
      emissiveIntensity: 0.78,
      rimColor: 0xffe599,
      rimIntensity: 0.62,
    });

    // Living moss-and-crystal clusters flanking the west <-> grotto bridge
    const grottoBridge = SANCTUARY_BRIDGES[7];
    if (grottoBridge) {
      for (let s = 0; s < 4; s++) {
        const u = (s + 0.5) / 4;
        const bx = grottoBridge.ax + (grottoBridge.bx - grottoBridge.ax) * u;
        const by = grottoBridge.ay + (grottoBridge.by - grottoBridge.ay) * u;
        const bz = grottoBridge.az + (grottoBridge.bz - grottoBridge.az) * u;
        for (const side of [-1, 1]) {
          const cluster = new THREE.Mesh(
            new THREE.ConeGeometry(0.24, 0.78, 6),
            (s + (side > 0 ? 1 : 0)) % 2 === 0 ? grottoCrystalCyanMat : grottoCrystalVioletMat
          );
          cluster.position.set(bx + side * 2.35, by + 0.32, bz + side * 0.45);
          cluster.rotation.z = -side * 0.22;
          grottoGrp.add(cluster);
        }
      }
    }

    this.grottoLagoonPools = [];
    const lagoonSpecs = [
      { x: -41.0, z: 9.8, r: 3.8, col: 0x3bf0c5 },
      { x: -36.0, z: 13.4, r: 2.3, col: 0x62f5e4 },
    ];
    for (let i = 0; i < lagoonSpecs.length; i++) {
      const ls = lagoonSpecs[i];
      const py = 0.8;
      const poolGrp = new THREE.Group();
      poolGrp.position.set(ls.x, py, ls.z);

      const rimTorus = new THREE.Mesh(
        new THREE.TorusGeometry(ls.r, 0.28, 8, 28),
        grottoStoneMat
      );
      rimTorus.rotation.x = Math.PI / 2;
      rimTorus.position.y = 0.08;
      poolGrp.add(rimTorus);

      const waterMat = new THREE.MeshBasicMaterial({
        color: ls.col,
        transparent: true,
        opacity: 0.78,
      });
      const waterDisc = new THREE.Mesh(new THREE.CircleGeometry(ls.r * 0.96, 28), waterMat);
      waterDisc.rotation.x = -Math.PI / 2;
      waterDisc.position.y = 0.04;
      poolGrp.add(waterDisc);

      const rippleMat = new THREE.MeshBasicMaterial({
        color: 0xb8fff6,
        transparent: true,
        opacity: 0.52,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const rippleMesh = new THREE.Mesh(
        new THREE.RingGeometry(ls.r * 0.35, ls.r * 0.52, 26),
        rippleMat
      );
      rippleMesh.rotation.x = -Math.PI / 2;
      rippleMesh.position.y = 0.07;
      poolGrp.add(rippleMesh);

      for (let c = 0; c < 5; c++) {
        const ang = (c / 5) * Math.PI * 2 + i * 0.6;
        const crystal = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.32 + (c % 2) * 0.12, 0),
          c % 2 === 0 ? grottoCrystalCyanMat : grottoCrystalVioletMat
        );
        crystal.scale.set(0.8, 1.8, 0.8);
        crystal.position.set(
          Math.cos(ang) * (ls.r + 0.15),
          0.38,
          Math.sin(ang) * (ls.r + 0.15)
        );
        poolGrp.add(crystal);
      }

      grottoGrp.add(poolGrp);
      this.grottoLagoonPools.push({
        group: poolGrp,
        rippleMesh,
        rippleMat,
        waterMat,
        phase: i * 1.7,
      });
    }

    this.grottoSporeCaps = [];
    const giantCapSpecs = [
      { x: -46.2, z: 6.0, h: 4.4, capR: 2.45, col: 0x3bf0c5, phase: 0.0 },
      { x: -45.8, z: 14.2, h: 4.8, capR: 2.75, col: 0xc084fc, phase: 1.5 },
      { x: -38.4, z: 18.0, h: 3.9, capR: 2.15, col: 0x62f5e4, phase: 3.1 },
      { x: -34.2, z: 9.0, h: 3.6, capR: 1.95, col: 0xffd166, phase: 4.6 },
    ];
    const giantStemMat = createOddrootToonRimMaterial(this.toonGradientTex, {
      color: 0xe6f7f2,
      emissive: 0x1e4d45,
      emissiveIntensity: 0.42,
      rimColor: 0x62f5e4,
      rimIntensity: 0.45,
    });
    for (const sc of giantCapSpecs) {
      const capGrp = new THREE.Group();
      capGrp.position.set(sc.x, 0.8, sc.z);

      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.46, sc.h, 10),
        giantStemMat
      );
      stem.position.y = sc.h * 0.5;
      capGrp.add(stem);

      const capMat = createOddrootToonRimMaterial(this.toonGradientTex, {
        color: sc.col,
        emissive: sc.col,
        emissiveIntensity: 0.72,
        rimColor: 0xffffff,
        rimIntensity: 0.68,
      });
      const capDome = new THREE.Mesh(
        new THREE.ConeGeometry(sc.capR, sc.capR * 0.68, 16),
        capMat
      );
      capDome.position.y = sc.h + sc.capR * 0.24;
      capGrp.add(capDome);

      const gillRing = new THREE.Mesh(
        new THREE.TorusGeometry(sc.capR * 0.74, 0.08, 8, 22),
        grottoCrystalCyanMat
      );
      gillRing.rotation.x = Math.PI / 2;
      gillRing.position.y = sc.h - 0.08;
      capGrp.add(gillRing);

      grottoGrp.add(capGrp);
      this.grottoSporeCaps.push({
        group: capGrp,
        capDome,
        capMat,
        gillRing,
        baseHeight: sc.h,
        phase: sc.phase,
      });
    }

    // 2. Sky-Root Windward Spire (41, 10, topY = 1.8): living root-bridge, windward spire & Golden Soaring Updraft Wind Rings
    const skyrootGrp = new THREE.Group();
    skyrootGrp.name = "SkyRootWindwardSpire";
    this.outerBiomesGroup.add(skyrootGrp);

    const livingRootMat = createOddrootToonRimMaterial(this.toonGradientTex, {
      color: 0x6e4726,
      emissive: 0x2b1808,
      emissiveIntensity: 0.3,
      rimColor: 0xffd166,
      rimIntensity: 0.48,
    });
    const windGoldMat = createOddrootToonRimMaterial(this.toonGradientTex, {
      color: 0xffd166,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.92,
      rimColor: 0xffffff,
      rimIntensity: 0.74,
    });

    // Braided living root arches along the east <-> skyroot bridge
    const skyrootBridge = SANCTUARY_BRIDGES[8];
    if (skyrootBridge) {
      for (let s = 0; s < 3; s++) {
        const u = (s + 0.5) / 3;
        const bx = skyrootBridge.ax + (skyrootBridge.bx - skyrootBridge.ax) * u;
        const by = skyrootBridge.ay + (skyrootBridge.by - skyrootBridge.ay) * u;
        const bz = skyrootBridge.az + (skyrootBridge.bz - skyrootBridge.az) * u;
        const rootTendrilArch = new THREE.Mesh(
          new THREE.TorusGeometry(2.65, 0.14, 8, 20, Math.PI),
          livingRootMat
        );
        rootTendrilArch.position.set(bx, by + 0.1, bz);
        rootTendrilArch.rotation.y = Math.atan2(
          skyrootBridge.bx - skyrootBridge.ax,
          skyrootBridge.bz - skyrootBridge.az
        );
        skyrootGrp.add(rootTendrilArch);
      }
    }

    // Sculpted Windward Living Root-Spire on the outer skyroot cliff rim
    const spireGrp = new THREE.Group();
    spireGrp.position.set(46.8, 1.8, 11.2);
    const spireTrunk = new THREE.Mesh(
      new THREE.ConeGeometry(2.1, 8.6, 10),
      livingRootMat
    );
    spireTrunk.position.y = 4.3;
    spireGrp.add(spireTrunk);

    for (let r = 0; r < 3; r++) {
      const coil = new THREE.Mesh(
        new THREE.TorusGeometry(1.75 - r * 0.35, 0.12, 8, 22),
        windGoldMat
      );
      coil.rotation.x = Math.PI / 2 + 0.22 * (r % 2 === 0 ? 1 : -1);
      coil.position.y = 2.2 + r * 2.1;
      spireGrp.add(coil);
    }

    this.skyrootSpireCrown = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.92, 0),
      windGoldMat
    );
    this.skyrootSpireCrown.position.y = 9.4;
    spireGrp.add(this.skyrootSpireCrown);

    this.skyrootSpireHalo = new THREE.Mesh(
      new THREE.TorusGeometry(1.65, 0.08, 8, 28),
      grottoCrystalCyanMat
    );
    this.skyrootSpireHalo.position.y = 9.4;
    this.skyrootSpireHalo.rotation.x = Math.PI * 0.32;
    spireGrp.add(this.skyrootSpireHalo);
    skyrootGrp.add(spireGrp);

    // Golden Soaring Updraft Wind Rings on Sky-Root Windward Spire
    this.skyrootWindRings = [];
    const windRingSpecs = [
      { x: 36.5, z: 6.8, rotY: 0.45, radius: 4.2 },
      { x: 41.5, z: 11.5, rotY: 0.15, radius: 4.2 },
      { x: 39.0, z: 16.2, rotY: -0.35, radius: 4.2 },
    ];
    for (let i = 0; i < windRingSpecs.length; i++) {
      const wr = windRingSpecs[i];
      const ringGrp = new THREE.Group();
      ringGrp.name = `SkyrootWindRing_${i}`;
      ringGrp.position.set(wr.x, 1.8 + 1.85, wr.z);
      ringGrp.rotation.y = wr.rotY;

      const outerMat = createOddrootToonRimMaterial(this.toonGradientTex, {
        color: 0xffd166,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.95,
        rimColor: 0xffffff,
        rimIntensity: 0.78,
      });
      const outerRing = new THREE.Mesh(
        new THREE.TorusGeometry(2.15, 0.15, 10, 28),
        outerMat
      );
      ringGrp.add(outerRing);

      const innerMat = new THREE.MeshBasicMaterial({
        color: 0x62f5e4,
        transparent: true,
        opacity: 0.76,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const innerRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.62, 0.08, 8, 24),
        innerMat
      );
      ringGrp.add(innerRing);

      const pedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.65, 0.36, 8),
        livingRootMat
      );
      pedestal.position.y = -1.68;
      ringGrp.add(pedestal);

      skyrootGrp.add(ringGrp);
      this.skyrootWindRings.push({
        index: i,
        x: wr.x,
        y: 1.8,
        z: wr.z,
        radius: wr.radius,
        cooldown: 0,
        group: ringGrp,
        outerRing,
        innerRing,
        outerMat,
      });
    }
  }

  _buildExpeditionBeacons() {
    this.expeditionBeaconGroup = new THREE.Group();
    this.expeditionBeaconGroup.name = "OddrootExpeditionBeacons";
    this.scene.add(this.expeditionBeaconGroup);

    this.expeditionBeacons = [];
    for (let i = 0; i < 3; i++) {
      const bGrp = new THREE.Group();
      bGrp.name = `OddrootExpeditionBeacon_${i}`;

      const outerMat = new THREE.MeshBasicMaterial({
        color: 0xffd166,
        transparent: true,
        opacity: 0.86,
      });
      const outerRing = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.12, 8, 24), outerMat);
      outerRing.rotation.x = Math.PI / 2;
      outerRing.position.y = 0.35;
      bGrp.add(outerRing);

      const innerMat = new THREE.MeshBasicMaterial({
        color: 0x3bf0c5,
        transparent: true,
        opacity: 0.8,
      });
      const innerRing = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.08, 8, 20), innerMat);
      innerRing.rotation.x = Math.PI / 2;
      innerRing.position.y = 1.15;
      bGrp.add(innerRing);

      const needleMat = new THREE.MeshBasicMaterial({
        color: 0xaef6ff,
        transparent: true,
        opacity: 0.44,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.3, 9.5, 10), needleMat);
      needle.position.y = 4.9;
      bGrp.add(needle);

      const crownGem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.45, 0),
        createOddrootToonRimMaterial(this.toonGradientTex, {
          color: 0xffd166,
          emissive: 0x3bf0c5,
          emissiveIntensity: 0.88,
          rimColor: 0xffffff,
          rimIntensity: 0.7,
        })
      );
      crownGem.position.y = 2.35;
      bGrp.add(crownGem);

      this.expeditionBeaconGroup.add(bGrp);
      this.expeditionBeacons.push({
        index: i,
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
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.expeditionBurstMesh = new THREE.Mesh(
      new THREE.TorusGeometry(1.6, 0.2, 8, 24),
      burstMat
    );
    this.expeditionBurstMesh.rotation.x = Math.PI / 2;
    this.expeditionBurstMesh.visible = false;
    this.expeditionBeaconGroup.add(this.expeditionBurstMesh);

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
      if (!wp || wp.collected) {
        slot.group.visible = false;
        continue;
      }
      const gy = this._groundHeightAt(wp.x, wp.z);
      slot.group.position.set(wp.x, gy + 0.08, wp.z);
      slot.group.visible = true;
    }
  }

  _triggerExpeditionBurst(wx, wy, wz) {
    if (!this.expeditionBurstMesh) return;
    this.expeditionBurstMesh.position.set(wx, wy + 0.6, wz);
    this.expeditionBurstMesh.scale.setScalar(1.0);
    this.expeditionBurstMesh.material.opacity = 0.9;
    this.expeditionBurstMesh.visible = true;
    this._expeditionBurstTimer = 0.58;
  }

  _buildWorldTreeMoonwellAndObservatory() {
    // 1. Central Moonwell Pond at (0, 0) ("the moon is in the middle")
    this.moonwellGroup = new THREE.Group();
    this.moonwellGroup.name = "CentralMoonwellSanctuary";
    this.moonwellGroup.position.set(0, 0, 0);

    const pondRim = new THREE.Mesh(
      new THREE.TorusGeometry(4.4, 0.34, 10, 36),
      createOddrootToonRimMaterial(this.toonGradientTex, {
        color: 0x325e54,
        emissive: 0x114238,
        emissiveIntensity: 0.35,
      })
    );
    pondRim.rotation.x = Math.PI / 2;
    pondRim.position.y = 0.18;
    this.moonwellGroup.add(pondRim);

    const moonRuneBezel = new THREE.Mesh(
      new THREE.TorusGeometry(4.42, 0.065, 8, 36),
      createOddrootToonRimMaterial(this.toonGradientTex, {
        color: 0xffd166,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.62,
      })
    );
    moonRuneBezel.rotation.x = Math.PI / 2;
    moonRuneBezel.position.y = 0.46;
    this.moonwellGroup.add(moonRuneBezel);

    const lotusMat = createOddrootToonRimMaterial(this.toonGradientTex, {
      color: 0xb8fff6,
      emissive: 0x3bf0c5,
      emissiveIntensity: 0.72,
    });
    const lotusGeo = new THREE.OctahedronGeometry(0.22, 0);
    for (let l = 0; l < 8; l++) {
      const lAng = (l / 8) * Math.PI * 2 + Math.PI / 8;
      const lotus = new THREE.Mesh(lotusGeo, lotusMat);
      lotus.scale.set(1.2, 0.55, 1.2);
      lotus.position.set(Math.cos(lAng) * 4.38, 0.52, Math.sin(lAng) * 4.38);
      this.moonwellGroup.add(lotus);
    }

    const pondWater = new THREE.Mesh(
      new THREE.CircleGeometry(4.35, 36),
      new THREE.MeshBasicMaterial({
        color: 0x4de8dd,
        transparent: true,
        opacity: 0.44,
      })
    );
    pondWater.rotation.x = -Math.PI / 2;
    pondWater.position.y = 0.12;
    this.moonwellGroup.add(pondWater);

    this.centralMoonLantern = new THREE.Mesh(
      new THREE.SphereGeometry(0.68, 16, 14),
      createOddrootToonRimMaterial(this.toonGradientTex, {
        color: 0xfff8dc,
        emissive: 0x62f5e4,
        emissiveIntensity: 0.88,
      })
    );
    this.centralMoonLantern.position.set(0, 2.35, 0);
    const moonLanternHalo = new THREE.Mesh(
      new THREE.TorusGeometry(0.98, 0.055, 8, 28),
      createOddrootToonRimMaterial(this.toonGradientTex, {
        color: 0xffd166,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.75,
      })
    );
    moonLanternHalo.rotation.x = Math.PI / 3;
    this.centralMoonLantern.add(moonLanternHalo);
    this.moonwellGroup.add(this.centralMoonLantern);
    this.scene.add(this.moonwellGroup);

    // 2. Ancient World-Tree Buttress Roots, Multi-Clustered Glowing Canopy Crowns & Lantern Vines
    this.worldTreeGroup = new THREE.Group();
    this.worldTreeGroup.name = "SanctuaryWorldTree";
    this.worldTreeGroup.position.set(0, 0, -4.5);

    const barkMat = createOddrootToonRimMaterial(this.toonGradientTex, {
      color: 0x5c4028,
      emissive: 0x24160b,
      emissiveIntensity: 0.25,
      rimColor: 0x5ef2c8,
      rimIntensity: 0.32,
    });
    this.canopyMat = createOddrootToonRimMaterial(this.toonGradientTex, {
      color: 0x249e7e,
      emissive: 0x10b981,
      emissiveIntensity: 0.45,
      rimColor: 0xffd166,
      rimIntensity: 0.56,
    });
    const vineStrandMat = createOddrootToonRimMaterial(this.toonGradientTex, {
      color: 0x3bf0c5,
      emissive: 0x0d9488,
      emissiveIntensity: 0.65,
    });
    const starLanternMat = createOddrootToonRimMaterial(this.toonGradientTex, {
      color: 0xfff3b0,
      emissive: 0xffb703,
      emissiveIntensity: 0.94,
      rimColor: 0xffffff,
      rimIntensity: 0.7,
    });

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 2.7, 11.8, 14), barkMat);
    trunk.position.y = 5.9;
    this.worldTreeGroup.add(trunk);

    for (let r = 0; r < 5; r++) {
      const ang = (r / 5) * Math.PI * 2 + Math.PI / 5;
      const rootArch = new THREE.Mesh(
        new THREE.TorusGeometry(4.2, 0.45, 8, 20, Math.PI * 0.6),
        barkMat
      );
      rootArch.position.set(Math.cos(ang) * 2.8, 0.4, Math.sin(ang) * 2.8);
      rootArch.rotation.y = -ang;
      this.worldTreeGroup.add(rootArch);

      // Upper spreading canopy boughs
      const bough = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.62, 5.4, 8),
        barkMat
      );
      bough.position.set(Math.cos(ang) * 2.6, 11.2, Math.sin(ang) * 2.6);
      bough.rotation.z = -Math.cos(ang) * 0.68;
      bough.rotation.x = Math.sin(ang) * 0.68;
      this.worldTreeGroup.add(bough);
    }

    // Multi-clustered glowing canopy crowns
    const mainCanopy = new THREE.Mesh(new THREE.DodecahedronGeometry(6.6, 1), this.canopyMat);
    mainCanopy.position.set(0, 14.2, 0);
    mainCanopy.scale.set(1.28, 0.72, 1.28);
    this.worldTreeGroup.add(mainCanopy);

    const apexCrown = new THREE.Mesh(new THREE.DodecahedronGeometry(4.4, 1), this.canopyMat);
    apexCrown.position.set(0, 17.1, -0.4);
    apexCrown.scale.set(1.18, 0.68, 1.18);
    this.worldTreeGroup.add(apexCrown);

    this.worldTreeLanternVines = [];
    const vineCylGeo = new THREE.CylinderGeometry(0.055, 0.04, 3.4, 6);
    const vineOrbGeo = new THREE.OctahedronGeometry(0.28, 1);
    const vineHaloGeo = new THREE.TorusGeometry(0.38, 0.04, 6, 16);

    for (let c = 0; c < 6; c++) {
      const cAng = (c / 6) * Math.PI * 2 + 0.26;
      const cRad = 5.2 + (c % 2) * 0.85;
      const subCrownY = 12.4 + (c % 3) * 0.75;
      const subCrown = new THREE.Mesh(
        new THREE.DodecahedronGeometry(3.6 + (c % 2) * 0.5, 1),
        this.canopyMat
      );
      subCrown.position.set(Math.cos(cAng) * cRad, subCrownY, Math.sin(cAng) * cRad);
      subCrown.scale.set(1.15, 0.66, 1.15);
      this.worldTreeGroup.add(subCrown);

      // Hanging starlight lantern vine suspended from each outer canopy cluster
      const vinePivot = new THREE.Group();
      vinePivot.position.set(Math.cos(cAng) * (cRad + 0.5), subCrownY - 1.2, Math.sin(cAng) * (cRad + 0.5));
      const vineLenScale = 0.85 + (c % 3) * 0.22;
      const strand = new THREE.Mesh(vineCylGeo, vineStrandMat);
      strand.scale.set(1, vineLenScale, 1);
      strand.position.y = -1.7 * vineLenScale;

      const tipY = -3.4 * vineLenScale;
      const lanternGem = new THREE.Mesh(vineOrbGeo, starLanternMat);
      lanternGem.position.y = tipY - 0.18;
      const lanternRing = new THREE.Mesh(vineHaloGeo, vineStrandMat);
      lanternRing.position.y = tipY - 0.18;

      vinePivot.add(strand, lanternGem, lanternRing);
      this.worldTreeGroup.add(vinePivot);
      this.worldTreeLanternVines.push(vinePivot);
    }

    this.scene.add(this.worldTreeGroup);

    // 3. Sanctuary World-Tree Guardian (animated during World-Tree awakening)
    this.guardianGroup = new THREE.Group();
    this.guardianGroup.name = "SanctuaryWorldTreeGuardian";
    this.guardianGroup.position.set(0, 11.5, -4.5);
    const guardMat = createOddrootToonRimMaterial(this.toonGradientTex, {
      color: 0x62f5e4,
      emissive: 0xffd166,
      emissiveIntensity: 0.65,
      rimColor: 0xffffff,
      rimIntensity: 0.7,
    });
    const guardCore = new THREE.Mesh(new THREE.OctahedronGeometry(1.45, 1), guardMat);
    const guardCrown = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.14, 8, 28), guardMat);
    guardCrown.rotation.x = Math.PI / 2.4;
    this.guardianGroup.add(guardCore, guardCrown);
    this.scene.add(this.guardianGroup);

    // 4. Shared 6-Tier Great Northern Observatory Spire at (0, 3.6, -60)
    this.observatoryGroup = new THREE.Group();
    this.observatoryGroup.name = "GreatNorthernObservatory";
    this.observatoryGroup.position.set(0, 3.6, -60);

    const spireTower = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 3.2, 18.0, 14),
      createOddrootToonRimMaterial(this.toonGradientTex, {
        color: 0x264653,
        emissive: 0x0f2936,
        emissiveIntensity: 0.3,
      })
    );
    spireTower.position.y = 9.0;
    this.observatoryGroup.add(spireTower);

    this.observatoryRings = [];
    for (let i = 0; i < 6; i++) {
      const rMat = createOddrootToonRimMaterial(this.toonGradientTex, {
        color: 0xffd166,
        emissive: 0x3bf0c5,
        emissiveIntensity: 0.12,
      });
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(3.8 - i * 0.34, 0.18, 8, 32),
        rMat
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 4.2 + i * 2.5;
      this.observatoryGroup.add(ring);
      this.observatoryRings.push({ mesh: ring, mat: rMat, tier: i + 1 });
    }
    this.scene.add(this.observatoryGroup);
  }

  _buildHarvestableThickets() {
    // 28 Harvestable Botanical Thickets (14 +Sun-Berry, 14 -Frost-Spore) via InstancedMesh
    this.thickets = [];
    const geo = new THREE.DodecahedronGeometry(0.62, 0);
    const sunMat = createOddrootToonRimMaterial(this.toonGradientTex, {
      color: 0xffcf56,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.55,
    });
    const frostMat = createOddrootToonRimMaterial(this.toonGradientTex, {
      color: 0x4ad8ff,
      emissive: 0x0284c7,
      emissiveIntensity: 0.55,
    });

    this.sunThicketInst = new THREE.InstancedMesh(geo, sunMat, 14);
    this.frostThicketInst = new THREE.InstancedMesh(geo, frostMat, 14);
    this.scene.add(this.sunThicketInst, this.frostThicketInst);

    const starterThicketOverrides = {
      0: { x: 0.75, z: 10.6, y: 0.55 },
      1: { x: 2.35, z: 5.6, y: 0.55 },
      14: { x: -0.75, z: 10.6, y: 0.55 },
      15: { x: 4.5, z: 0.6, y: 0.55 },
    };

    for (let i = 0; i < 28; i++) {
      const isl = SANCTUARY_ISLANDS[i % 5];
      const ang = (i * 2.15) % (Math.PI * 2);
      const rad = 5.4 + ((i * 1.7) % Math.max(2, isl.radius - 6.2));
      const ov = starterThicketOverrides[i] || null;
      const tx = ov ? ov.x : isl.x + Math.cos(ang) * rad;
      const tz = ov ? ov.z : isl.z + Math.sin(ang) * rad;
      const ty = ov ? ov.y : isl.topY + 0.55;
      const polarity = i < 14 ? "+" : "-";
      const instIdx = i < 14 ? i : i - 14;

      this.thickets.push({
        index: i,
        instIdx,
        polarity,
        x: tx,
        y: ty,
        z: tz,
        active: true,
        regrowSec: 0,
      });
    }
    this._syncThicketInstances();
  }

  _syncThicketInstances() {
    for (const th of this.thickets) {
      this._tmpObj.position.set(th.x, th.active ? th.y : -40, th.z);
      this._tmpObj.rotation.set(0, th.index * 0.5, 0);
      this._tmpObj.scale.setScalar(th.active ? 1.0 : 0.001);
      this._tmpObj.updateMatrix();
      if (th.polarity === "+") {
        this.sunThicketInst.setMatrixAt(th.instIdx, this._tmpObj.matrix);
      } else {
        this.frostThicketInst.setMatrixAt(th.instIdx, this._tmpObj.matrix);
      }
    }
    this.sunThicketInst.instanceMatrix.needsUpdate = true;
    this.frostThicketInst.instanceMatrix.needsUpdate = true;
  }

  _buildSiphonProjectilePool() {
    this.siphonProjectiles = [];
    this.siphonPoolGroup = new THREE.Group();
    this.siphonPoolGroup.name = "SiphonProjectilePool";
    this.scene.add(this.siphonPoolGroup);

    const speciesGeos = {
      sun_orb: new THREE.IcosahedronGeometry(0.32, 0),
      frost_spore: new THREE.OctahedronGeometry(0.34, 0),
      rune_pod: new THREE.CapsuleGeometry(0.24, 0.38, 5, 10),
      helium_puff: new THREE.DodecahedronGeometry(0.38, 1),
    };
    const speciesMats = {};
    for (const [key, spec] of Object.entries(SIPHON_ORB_SPECS)) {
      speciesMats[key] = createOddrootToonRimMaterial(this.toonGradientTex, {
        color: spec.colorHex,
        emissive: spec.emissiveHex,
        emissiveIntensity: 0.68,
      });
    }
    this._siphonGeos = speciesGeos;
    this._siphonMats = speciesMats;

    for (let i = 0; i < 48; i++) {
      const mesh = new THREE.Mesh(speciesGeos.sun_orb, speciesMats.sun_orb);
      mesh.visible = false;
      this.siphonPoolGroup.add(mesh);
      this.siphonProjectiles.push({
        active: false,
        speciesId: "sun_orb",
        elapsed: 0,
        duration: 0.52,
        startPos: new THREE.Vector3(),
        targetPos: new THREE.Vector3(),
        arcHeight: 2.2,
        buoyantLift: 0.0,
        mesh,
      });
    }
  }

  _buildSkyWhaleAndGhost() {
    this.skyWhale = new THREE.Group();
    this.skyWhale.name = "OverdriveStarlightWhale";
    this.skyWhale.visible = false;
    const whaleMat = createOddrootToonRimMaterial(this.toonGradientTex, {
      color: 0xc084fc,
      emissive: 0x62f5e4,
      emissiveIntensity: 0.72,
    });
    const wBody = new THREE.Mesh(new THREE.CapsuleGeometry(1.6, 5.8, 8, 16), whaleMat);
    wBody.rotation.x = Math.PI / 2;
    this.skyWhale.add(wBody);
    for (const sx of [-1, 1]) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.18, 1.2), whaleMat);
      fin.position.set(sx * 2.1, -0.1, 0.6);
      this.skyWhale.add(fin);
    }
    this.scene.add(this.skyWhale);

    // Self-vs-Self Translucent 3D Ghost
    this.ghostGroup = new THREE.Group();
    this.ghostGroup.name = "SelfPersonalBestGhost";
    this.ghostGroup.visible = false;
    const ghostMat = new THREE.MeshBasicMaterial({
      color: 0x62f5e4,
      transparent: true,
      opacity: 0.36,
    });
    const ghostMesh = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.65, 10), ghostMat);
    ghostMesh.position.y = 0.9;
    this.ghostGroup.add(ghostMesh);
    this.scene.add(this.ghostGroup);
  }

  _buildSporeLilyPool() {
    const lilyGeo = new THREE.ConeGeometry(0.26, 0.54, 6);
    lilyGeo.rotateX(Math.PI);
    const lilyMat = createOddrootToonRimMaterial(this.toonGradientTex, {
      color: 0xffffff,
      emissive: 0x3bf0c5,
      emissiveIntensity: 0.68,
      rimColor: 0xffd166,
      rimIntensity: 0.55,
    });

    this.sporeLilyMesh = new THREE.InstancedMesh(lilyGeo, lilyMat, MAX_SPORE_LILIES);
    this.sporeLilyMesh.name = "PrismaticSporeLilyWake";
    this.sporeLilyMesh.frustumCulled = false;

    this._sporeLilyPalette = [
      new THREE.Color(0x62f5e4),
      new THREE.Color(0xffd166),
      new THREE.Color(0xc084fc),
      new THREE.Color(0x7ee081),
    ];

    this.sporeLilies = [];
    this.sporeLilyCursor = 0;
    this.activeSporeLilyCount = 0;
    this._sporeWakeDistAccum = 0;
    this._lastWakeX = this.rigState.x;
    this._lastWakeZ = this.rigState.z;

    this._tmpObj.position.set(0, -40, 0);
    this._tmpObj.rotation.set(0, 0, 0);
    this._tmpObj.scale.setScalar(0.001);
    this._tmpObj.updateMatrix();

    for (let i = 0; i < MAX_SPORE_LILIES; i++) {
      this.sporeLilyMesh.setMatrixAt(i, this._tmpObj.matrix);
      this.sporeLilyMesh.setColorAt(i, this._sporeLilyPalette[i % this._sporeLilyPalette.length]);
      this.sporeLilies.push({
        active: false,
        x: 0,
        y: -40,
        z: 0,
        rotY: 0,
        scale: 0.001,
        targetScale: 1.0,
      });
    }
    this.sporeLilyMesh.instanceMatrix.needsUpdate = true;
    if (this.sporeLilyMesh.instanceColor) {
      this.sporeLilyMesh.instanceColor.needsUpdate = true;
    }
    this.scene.add(this.sporeLilyMesh);
  }

  hasSporeWakeActive() {
    const upg = this.rigState.upgradesSet;
    return Boolean(
      this.rigState.inSurge ||
        upg.has("or_spore_wake") ||
        upg.has("or_prism_wake") ||
        upg.has("prismatic_trail")
    );
  }

  _spawnSporeLilyAt(wx, wy, wz) {
    if (!this.sporeLilyMesh) return;
    const idx = this.sporeLilyCursor;
    this.sporeLilyCursor = (this.sporeLilyCursor + 1) % MAX_SPORE_LILIES;
    const rec = this.sporeLilies[idx];
    if (!rec.active) {
      this.activeSporeLilyCount = Math.min(MAX_SPORE_LILIES, this.activeSporeLilyCount + 1);
    }
    rec.active = true;
    rec.x = wx;
    rec.y = wy;
    rec.z = wz;
    rec.rotY = (idx * 1.7) % (Math.PI * 2);
    rec.scale = 0.08;
    rec.targetScale = this.rigState.inSurge ? 1.25 : 1.08;

    const col = this._sporeLilyPalette[idx % this._sporeLilyPalette.length];
    this.sporeLilyMesh.setColorAt(idx, col);
    if (this.sporeLilyMesh.instanceColor) {
      this.sporeLilyMesh.instanceColor.needsUpdate = true;
    }

    this._tmpObj.position.set(wx, wy, wz);
    this._tmpObj.rotation.set(0, rec.rotY, 0);
    this._tmpObj.scale.setScalar(rec.scale);
    this._tmpObj.updateMatrix();
    this.sporeLilyMesh.setMatrixAt(idx, this._tmpObj.matrix);
    this.sporeLilyMesh.instanceMatrix.needsUpdate = true;
  }

  _stepSporeLilyWake(dt) {
    if (!this.sporeLilyMesh) return;
    const rx = this.rigState.x;
    const rz = this.rigState.z;
    const moved = Math.hypot(rx - this._lastWakeX, rz - this._lastWakeZ);
    this._lastWakeX = rx;
    this._lastWakeZ = rz;

    if (moved > 8.0) {
      this._sporeWakeDistAccum = 0;
    } else if (moved > 0.01 && !this.rigAnim && this.hasSporeWakeActive()) {
      const ground = this._sampleArchipelago(rx, rz);
      if (ground.onGround) {
        this._sporeWakeDistAccum += moved;
        while (this._sporeWakeDistAccum >= 1.35) {
          this._sporeWakeDistAccum -= 1.35;
          const side = (this.sporeLilyCursor % 2 === 0 ? 1 : -1) * 0.42;
          const lx = rx + Math.cos(this.rigState.heading) * side;
          const lz = rz - Math.sin(this.rigState.heading) * side;
          this._spawnSporeLilyAt(lx, ground.groundY + 0.24, lz);
        }
      }
    }

    if (this.activeSporeLilyCount > 0) {
      let dirty = false;
      for (let i = 0; i < MAX_SPORE_LILIES; i++) {
        const rec = this.sporeLilies[i];
        if (!rec.active || rec.scale >= rec.targetScale) continue;
        rec.scale = Math.min(rec.targetScale, rec.scale + dt * 3.2);
        this._tmpObj.position.set(rec.x, rec.y, rec.z);
        this._tmpObj.rotation.set(0, rec.rotY, 0);
        this._tmpObj.scale.setScalar(rec.scale);
        this._tmpObj.updateMatrix();
        this.sporeLilyMesh.setMatrixAt(i, this._tmpObj.matrix);
        dirty = true;
      }
      if (dirty) {
        this.sporeLilyMesh.instanceMatrix.needsUpdate = true;
      }
    }
  }

  // Lifecycle & Display
  start() {
    if (this.running) return;
    this.running = true;
    this.clock.getDelta();
    this._lastTickWallMs = typeof performance !== "undefined" ? performance.now() : Date.now();

    const runFrame = () => {
      if (!this.running) return;
      this._lastTickWallMs = typeof performance !== "undefined" ? performance.now() : Date.now();
      const rawDt = this.clock.getDelta();
      this._updateDprGovernor(rawDt);
      const wallDt = Math.min(0.45, Number.isFinite(rawDt) && rawDt > 0 ? rawDt : 1 / 60);
      const substeps = Math.max(1, Math.ceil(wallDt / 0.05));
      const subDt = wallDt / substeps;
      for (let i = 0; i < substeps; i++) {
        this.elapsedTime += subDt;
        this._update(subDt);
      }
      if (this.webglAvailable && this.renderer) {
        this.renderer.render(this.scene, this.camera);
      }
    };

    const tick = () => {
      if (!this.running) return;
      runFrame();
      if (typeof requestAnimationFrame === "function") {
        this._rafId = requestAnimationFrame(tick);
      }
    };
    if (typeof requestAnimationFrame === "function") {
      this._rafId = requestAnimationFrame(tick);
    }
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
    if (this._rafId !== null && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this.audio?.stopHum?.();
  }

  resize() {
    let w = 1280;
    let h = 720;
    if (this.canvas) {
      const rect =
        this.canvas.parentElement && typeof this.canvas.parentElement.getBoundingClientRect === "function"
          ? this.canvas.parentElement.getBoundingClientRect()
          : typeof this.canvas.getBoundingClientRect === "function"
          ? this.canvas.getBoundingClientRect()
          : null;
      const winW = typeof window !== "undefined" ? window.innerWidth : 1280;
      const winH = typeof window !== "undefined" ? window.innerHeight : 720;
      w = Math.max(300, (rect && rect.width) || this.canvas.clientWidth || winW || 1280);
      h = Math.max(260, (rect && rect.height) || this.canvas.clientHeight || winH || 720);
    }
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
    if (typeof window !== "undefined" && this._onResize) {
      window.removeEventListener("resize", this._onResize);
    }
    this.shrines?.dispose?.();
    this.slipstreamVfx?.dispose?.();
    this.horizonWonder?.dispose?.();
    if (this.renderer && typeof this.renderer.dispose === "function") {
      this.renderer.dispose();
    }
  }

  // Anxiety-Safe Opposition Pause Hook
  setEncounterDockOpen(isOpen) {
    this.encounterDockOpen = Boolean(isOpen);
    if (!this.encounterDockOpen) {
      this._gateAutoPause = false;
    }
  }

  isOppositionPaused() {
    return Boolean(this.encounterDockOpen || this._gateAutoPause);
  }

  // Loadout, Mounts, Cross-Realm, Observatory & Guardian
  _persistOddrootProgressMutation(mutatorFn) {
    const prog = this._boundProgressRef;
    if (!prog || typeof prog !== "object" || Object.isFrozen(prog)) return;
    try {
      if (!prog.games || typeof prog.games !== "object") {
        prog.games = {};
      }
      if (Object.isFrozen(prog.games)) return;
      if (!prog.games.oddroot || typeof prog.games.oddroot !== "object") {
        prog.games.oddroot = {};
      }
      if (Object.isFrozen(prog.games.oddroot)) return;
      mutatorFn(prog.games.oddroot);
    } catch (_) {}
  }

  applyLoadout(progress = {}, crossRealmUnlocks = null, borrowedToy = null) {
    this._boundProgressRef = progress && typeof progress === "object" ? progress : null;
    const oddState = progress?.games?.oddroot || {};
    const rawMount =
      borrowedToy?.oddrootLoadout?.mountId ||
      borrowedToy?.mountId ||
      oddState.equippedMount ||
      (progress?.equippedChassis === "aurora_sled" ? "starlight_glider" : "bramble_boar");

    const mountId = normalizeMountId(rawMount);
    const mergedUpgrades = new Set([
      ...(Array.isArray(progress?.ownedUpgrades) ? progress.ownedUpgrades : []),
      ...(Array.isArray(oddState.sanctuaryUpgrades) ? oddState.sanctuaryUpgrades : []),
      ...(Array.isArray(borrowedToy?.oddrootLoadout?.upgrades)
        ? borrowedToy.oddrootLoadout.upgrades
        : []),
      ...(Array.isArray(borrowedToy?.upgrades) ? borrowedToy.upgrades : []),
    ]);

    const cx = crossRealmUnlocks || {};
    const mysteries = new Set(
      Array.isArray(progress?.discoveredMysteries) ? progress.discoveredMysteries : []
    );
    const resolvedCross = {
      ...cx,
      goldenMosaicTrimUnlocked: Boolean(
        cx.goldenMosaicTrimUnlocked ||
          cx.mosaicUnlocked ||
          oddState.mosaicForged ||
          (progress?.nodes?.["W6.3"]?.stage || 0) >= 2
      ),
      auroraBladeTrimUnlocked: Boolean(
        cx.auroraBladeTrimUnlocked ||
          cx.frostwakePlowTrim ||
          (progress?.snowClearedM2 || 0) >= 100 ||
          mergedUpgrades.has("wide_blade")
      ),
      silverMoonLantern: Boolean(cx.silverMoonLantern || mysteries.has("moon_center")),
      titanAstrolabeSynced: Boolean(
        cx.titanAstrolabeSynced || cx.astrolabeUnlocked || mysteries.has("astrolabe_lock")
      ),
      astroToadUnlocked: Boolean(
        cx.astroToadUnlocked ||
          cx.subZeroUnlocked ||
          cx.subZeroAbyssUnlocked ||
          cx.cryoToadMascot ||
          (progress?.records?.deepestSubZero || 0) >= 100 ||
          mysteries.has("subzero_abyss")
      ),
      clockworkCrestUnlocked: Boolean(
        cx.clockworkCrestUnlocked ||
          cx.clockworkSentinelSynced ||
          mergedUpgrades.has("ab_auto_turret") ||
          mergedUpgrades.has("ab_chronos_harp") ||
          (progress?.games?.arc_bastion?.bastionUpgrades || []).includes("ab_auto_turret") ||
          (progress?.games?.arc_bastion?.bastionUpgrades || []).includes("ab_chronos_harp") ||
          (progress?.games?.arc_bastion?.contraptionsShattered || 0) >= 5 ||
          progress?.games?.bastion?.clockworkCrestUnlocked ||
          mergedUpgrades.has("bastion_clockwork_crest")
      ),
    };

    const completedExpCount = Math.max(
      0,
      Math.floor(Number(oddState.expeditionsCompleted) || 0)
    );
    if (!this.fieldExpedition || this.fieldExpedition.completedTotal !== completedExpCount) {
      this.fieldExpedition = createFieldExpeditionState("oddroot", completedExpCount);
      this._syncExpeditionBeacons();
    }

    this.rigState.rawMountVariant = rawMount;
    this.rigState.mountId = mountId;
    this.rigState.chassisId = mountId;
    this.rigState.upgrades = [...mergedUpgrades];
    this.rigState.upgradesSet = mergedUpgrades;
    this.rigState.crossRealmUnlocks = resolvedCross;
    this.rigState.borrowedToy = borrowedToy || null;

    this._moonMysterySent = mysteries.has("moon_center");
    this.moonDwellSec = 0;
    this.rigState.mosaicForged = Boolean(
      oddState.mosaicForged || resolvedCross.goldenMosaicTrimUnlocked
    );

    if (oddState.ghostBest && Array.isArray(oddState.ghostBest.frames)) {
      const dur =
        Number(oddState.ghostBest.durationSec) ||
        Number(oddState.ghostBest.bestWaveSec) ||
        Number(oddState.bestCircuitSec) ||
        0;
      this.ghostBest =
        dur > 0 ? { ...oddState.ghostBest, bestWaveSec: dur, durationSec: dur } : null;
    } else if (
      Array.isArray(oddState.ghostFrames) &&
      oddState.ghostFrames.length >= 2 &&
      Number(oddState.bestCircuitSec) > 0
    ) {
      const dur = Number(oddState.bestCircuitSec);
      this.ghostBest = {
        bestWaveSec: dur,
        durationSec: dur,
        frames: [...oddState.ghostFrames],
      };
    } else if (this._boundProgressRef) {
      this.ghostBest = null;
    }

    if (Array.isArray(this.thickets) && this.thickets.length > 0) {
      let regrew = false;
      for (const th of this.thickets) {
        if (!th.active) {
          th.active = true;
          th.regrowSec = 0;
          regrew = true;
        }
      }
      if (regrew) this._syncThicketInstances();
    }

    this.rebuildAvatar(mountId, this.rigState.upgrades);
    this.menagerie.syncFromProgress(progress, resolvedCross);
  }

  rebuildAvatar(mountId = "starlight_glider", upgrades = []) {
    if (this.avatarGroup && this.scene) {
      this.scene.remove(this.avatarGroup);
    }

    const normMount = normalizeMountId(mountId);
    const upgSet = new Set(Array.isArray(upgrades) ? upgrades : []);
    this.rigState.mountId = normMount;
    this.rigState.chassisId = normMount;
    this.rigState.upgrades = [...upgSet];
    this.rigState.upgradesSet = upgSet;

    const cx = this.rigState.crossRealmUnlocks || {};
    const borrowed = this.rigState.borrowedToy;

    const grp = new THREE.Group();
    grp.name = `OddrootAvatar_${normMount}`;

    const hasTuskPlow = upgSet.has("or_tusk_plow") || upgSet.has("wide_blade");
    const hasWideSiphon = upgSet.has("or_wide_siphon");
    const hasGlideWings = upgSet.has("or_glide_wings") || upgSet.has("ion_boosters");
    const hasCrystalFox = upgSet.has("or_crystal_fox") || upgSet.has("spirit_fox");
    const hasAntlerCrown =
      upgSet.has("or_antler_crown") ||
      upgSet.has("celestial_crown") ||
      this.rigState.rawMountVariant === "moon_stag";
    const hasSporeWake =
      upgSet.has("or_spore_wake") ||
      upgSet.has("or_prism_wake") ||
      upgSet.has("prismatic_trail");

    const primaryMat = createOddrootToonRimMaterial(this.toonGradientTex, {
      color: normMount === "bramble_boar" ? 0xd98a2b : 0x1e5c6b,
      emissive: normMount === "bramble_boar" ? 0x5c3409 : 0x0d3642,
      emissiveIntensity: 0.36,
      rimColor: normMount === "bramble_boar" ? 0xffd166 : 0x62f5e4,
      rimIntensity: 0.52,
    });
    const secondaryTunicMat = createOddrootToonRimMaterial(this.toonGradientTex, {
      color: 0x2c8c82,
      emissive: 0x114540,
      emissiveIntensity: 0.4,
      rimColor: 0x99f6e4,
      rimIntensity: 0.48,
    });
    const trimHex = cx.goldenMosaicTrimUnlocked
      ? 0xffd166
      : cx.auroraBladeTrimUnlocked
      ? 0x38f2ff
      : 0x7ee081;
    const trimMat = createOddrootToonRimMaterial(this.toonGradientTex, {
      color: trimHex,
      emissive: trimHex,
      emissiveIntensity: 0.64,
      rimColor: 0xffffff,
      rimIntensity: 0.62,
    });
    const goldBrassMat = createOddrootToonRimMaterial(this.toonGradientTex, {
      color: 0xf4c152,
      emissive: 0xb45309,
      emissiveIntensity: 0.52,
      rimColor: 0xfff8dc,
      rimIntensity: 0.62,
    });
    const darkCowlHollowMat = new THREE.MeshBasicMaterial({ color: 0x09131f });
    const eyeCyanMat = new THREE.MeshBasicMaterial({ color: 0x62f5e4 });
    const eyeGoldMat = new THREE.MeshBasicMaterial({ color: 0xffd166 });
    const amberLanternMat = createOddrootToonRimMaterial(this.toonGradientTex, {
      color: 0xffe599,
      emissive: 0xff9f1c,
      emissiveIntensity: 0.95,
      rimColor: 0xffffff,
      rimIntensity: 0.72,
    });
    const saddleWoodMat = createOddrootToonRimMaterial(this.toonGradientTex, {
      color: 0x5c3a21,
      emissive: 0x241307,
      emissiveIntensity: 0.25,
      rimColor: 0xffd166,
      rimIntensity: 0.36,
    });

    this.boarLegs = [];
    this.gliderWings = [];
    this.boarTailPivot = null;
    this.hipLantern = null;
    this.chestStarBrooch = null;
    this.siphonTipHalo = null;
    this._avatarBankRad = 0;

    if (normMount === "bramble_boar") {
      // Sculpted Bramble-Plow Boar: muscular barrel torso, armored shoulder hump & snout
      const boarBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.66, 1.22, 8, 14), primaryMat);
      boarBody.rotation.x = Math.PI / 2;
      boarBody.position.set(0, 0.86, 0.04);
      grp.add(boarBody);

      const shoulderHump = new THREE.Mesh(new THREE.SphereGeometry(0.72, 12, 10), primaryMat);
      shoulderHump.scale.set(1.06, 0.96, 0.92);
      shoulderHump.position.set(0, 0.98, -0.38);
      grp.add(shoulderHump);

      const snoutBridge = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.44, 0.62, 10),
        primaryMat
      );
      snoutBridge.rotation.x = Math.PI / 2 - 0.16;
      snoutBridge.position.set(0, 0.78, -1.06);
      grp.add(snoutBridge);

      const noseDisc = new THREE.Mesh(
        new THREE.CylinderGeometry(0.27, 0.27, 0.1, 10),
        saddleWoodMat
      );
      noseDisc.rotation.x = Math.PI / 2 - 0.16;
      noseDisc.position.set(0, 0.83, -1.36);
      grp.add(noseDisc);

      for (const nx of [-0.09, 0.09]) {
        const nostril = new THREE.Mesh(
          new THREE.SphereGeometry(0.048, 6, 6),
          darkCowlHollowMat
        );
        nostril.position.set(nx, 0.84, -1.4);
        grp.add(nostril);
      }

      // Glowing amber eyes + tufted pointed ears
      for (const sx of [-1, 1]) {
        const eyeAmber = new THREE.Mesh(
          new THREE.SphereGeometry(0.085, 8, 8),
          amberLanternMat
        );
        eyeAmber.position.set(sx * 0.36, 1.04, -0.84);
        const brow = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.06, 0.16),
          saddleWoodMat
        );
        brow.position.set(sx * 0.36, 1.13, -0.84);
        brow.rotation.z = -sx * 0.24;

        const earOuter = new THREE.Mesh(
          new THREE.ConeGeometry(0.16, 0.42, 7),
          primaryMat
        );
        earOuter.position.set(sx * 0.46, 1.34, -0.58);
        earOuter.rotation.set(-0.22, 0, -sx * 0.48);

        const earTuft = new THREE.Mesh(
          new THREE.ConeGeometry(0.09, 0.26, 6),
          trimMat
        );
        earTuft.position.set(sx * 0.54, 1.5, -0.62);
        earTuft.rotation.set(-0.22, 0, -sx * 0.52);

        grp.add(eyeAmber, brow, earOuter, earTuft);
      }

      // Bristled emerald-gold dorsal crest along spine
      for (let d = 0; d < 5; d++) {
        const dz = -0.64 + d * 0.32;
        const dy = 1.48 - Math.abs(d - 1.5) * 0.07;
        const crestSpine = new THREE.Mesh(
          new THREE.ConeGeometry(0.11, 0.36 - d * 0.03, 5),
          d % 2 === 0 ? trimMat : goldBrassMat
        );
        crestSpine.scale.set(0.55, 1.0, 1.25);
        crestSpine.rotation.x = -0.28;
        crestSpine.position.set(0, dy, dz);
        grp.add(crestSpine);
      }

      // 4 Articulated Legs with Cloven Hooves (strictly length === 4)
      for (const [lx, lz] of [
        [-0.48, -0.55],
        [0.48, -0.55],
        [-0.48, 0.55],
        [0.48, 0.55],
      ]) {
        const legPivot = new THREE.Group();
        legPivot.position.set(lx, 0.58, lz);
        const legShaft = new THREE.Mesh(
          new THREE.CylinderGeometry(0.15, 0.12, 0.52, 8),
          primaryMat
        );
        legShaft.position.y = -0.22;
        const hoof = new THREE.Mesh(
          new THREE.CylinderGeometry(0.13, 0.16, 0.16, 8),
          saddleWoodMat
        );
        hoof.position.y = -0.5;
        legPivot.add(legShaft, hoof);
        grp.add(legPivot);
        this.boarLegs.push(legPivot);
      }

      // Curved Rune-Ringed Crystal Tusks
      const tuskSpan = hasTuskPlow ? 0.92 : 0.54;
      const tuskRadius = hasTuskPlow ? 0.66 : 0.44;
      const tuskTube = hasTuskPlow ? 0.115 : 0.082;
      for (const sx of [-1, 1]) {
        const tuskGrp = new THREE.Group();
        tuskGrp.position.set(sx * tuskSpan, 0.72, -0.96);
        tuskGrp.rotation.y = sx * (hasTuskPlow ? 0.42 : 0.25);

        const tuskArc = new THREE.Mesh(
          new THREE.TorusGeometry(tuskRadius, tuskTube, 8, 16, Math.PI * 0.68),
          trimMat
        );
        tuskArc.rotation.y = Math.PI / 2;
        tuskArc.rotation.z = Math.PI * 0.85;
        tuskGrp.add(tuskArc);

        const tuskTip = new THREE.Mesh(
          new THREE.ConeGeometry(tuskTube * 1.05, 0.34, 8),
          trimMat
        );
        tuskTip.position.set(0, tuskRadius * 0.72, -tuskRadius * 0.68);
        tuskTip.rotation.x = -0.35;
        tuskGrp.add(tuskTip);

        // Two glowing golden rune rings encircling each crystal tusk
        for (const rFrac of [0.26, 0.54]) {
          const rAng = Math.PI * 0.85 + rFrac * Math.PI * 0.68;
          const runeBand = new THREE.Mesh(
            new THREE.TorusGeometry(tuskTube * 1.32, 0.024, 6, 14),
            goldBrassMat
          );
          runeBand.position.set(0, Math.sin(rAng) * tuskRadius, Math.cos(rAng) * tuskRadius);
          runeBand.rotation.x = -rAng + Math.PI / 2;
          tuskGrp.add(runeBand);
        }
        grp.add(tuskGrp);
      }

      // Carved Saddle + Warm Lantern Stirrups
      const saddleSeat = new THREE.Mesh(
        new THREE.BoxGeometry(0.86, 0.18, 0.76),
        saddleWoodMat
      );
      saddleSeat.position.set(0, 1.34, 0.1);
      const saddleTrim = new THREE.Mesh(
        new THREE.BoxGeometry(0.92, 0.08, 0.82),
        goldBrassMat
      );
      saddleTrim.position.set(0, 1.28, 0.1);
      grp.add(saddleSeat, saddleTrim);

      for (const sx of [-1, 1]) {
        const stirrupStrap = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, 0.48, 0.08),
          saddleWoodMat
        );
        stirrupStrap.position.set(sx * 0.68, 1.04, 0.1);
        const stirrupHoop = new THREE.Mesh(
          new THREE.TorusGeometry(0.13, 0.025, 6, 14),
          goldBrassMat
        );
        stirrupHoop.rotation.y = Math.PI / 2;
        stirrupHoop.position.set(sx * 0.72, 0.76, 0.1);
        const stirrupLantern = new THREE.Mesh(
          new THREE.SphereGeometry(0.095, 8, 8),
          amberLanternMat
        );
        stirrupLantern.position.set(sx * 0.74, 0.76, 0.1);
        grp.add(stirrupStrap, stirrupHoop, stirrupLantern);
      }

      // Wagging Tail Tuft
      this.boarTailPivot = new THREE.Group();
      this.boarTailPivot.position.set(0, 0.96, 0.98);
      const tailStem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.065, 0.38, 6),
        primaryMat
      );
      tailStem.rotation.x = 0.72;
      tailStem.position.set(0, 0.1, 0.14);
      const tailTuft = new THREE.Mesh(
        new THREE.ConeGeometry(0.15, 0.34, 7),
        trimMat
      );
      tailTuft.rotation.x = 0.85;
      tailTuft.position.set(0, 0.22, 0.3);
      this.boarTailPivot.add(tailStem, tailTuft);
      grp.add(this.boarTailPivot);

      // Detailed Hooded Rider Seated on Saddle
      const riderGrp = new THREE.Group();
      riderGrp.position.set(0, 1.42, 0.1);

      const riderCloak = new THREE.Mesh(
        new THREE.ConeGeometry(0.38, 0.72, 10),
        secondaryTunicMat
      );
      riderCloak.position.y = 0.32;
      const riderSash = new THREE.Mesh(
        new THREE.TorusGeometry(0.28, 0.04, 6, 16),
        goldBrassMat
      );
      riderSash.rotation.x = Math.PI / 2;
      riderSash.position.y = 0.26;

      const riderHollow = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 10, 8),
        darkCowlHollowMat
      );
      riderHollow.position.set(0, 0.76, -0.02);
      const riderHood = new THREE.Mesh(
        new THREE.ConeGeometry(0.3, 0.48, 10),
        secondaryTunicMat
      );
      riderHood.position.set(0, 0.88, 0.04);
      riderHood.rotation.x = 0.26;

      for (const ex of [-0.075, 0.075]) {
        const rEye = new THREE.Mesh(new THREE.SphereGeometry(0.036, 6, 6), eyeCyanMat);
        rEye.position.set(ex, 0.76, -0.19);
        riderGrp.add(rEye);
      }

      riderGrp.add(riderCloak, riderSash, riderHollow, riderHood);
      grp.add(riderGrp);
    } else {
      // Sculpted Starlight Glide-Cape Ranger:
      // 1. Layered twilight ranger cloak + inner tunic + flowing sash
      const outerCloak = new THREE.Mesh(
        new THREE.ConeGeometry(0.64, 1.34, 14),
        primaryMat
      );
      outerCloak.position.y = 0.88;
      grp.add(outerCloak);

      const cloakHemTrim = new THREE.Mesh(
        new THREE.TorusGeometry(0.61, 0.038, 8, 24),
        goldBrassMat
      );
      cloakHemTrim.rotation.x = Math.PI / 2;
      cloakHemTrim.position.y = 0.24;
      grp.add(cloakHemTrim);

      const innerTunic = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.44, 0.94, 12),
        secondaryTunicMat
      );
      innerTunic.position.set(0, 1.06, -0.04);
      grp.add(innerTunic);

      const waistSash = new THREE.Mesh(
        new THREE.TorusGeometry(0.37, 0.052, 8, 20),
        goldBrassMat
      );
      waistSash.rotation.x = Math.PI / 2;
      waistSash.position.y = 0.98;
      grp.add(waistSash);

      for (const sx of [-1, 1]) {
        const sashTail = new THREE.Mesh(
          new THREE.BoxGeometry(0.11, 0.56, 0.04),
          goldBrassMat
        );
        sashTail.position.set(sx * 0.14, 0.68, 0.36);
        sashTail.rotation.set(0.24, 0, sx * 0.12);
        grp.add(sashTail);
      }

      const shoulderMantle = new THREE.Mesh(
        new THREE.ConeGeometry(0.54, 0.46, 12),
        secondaryTunicMat
      );
      shoulderMantle.position.y = 1.48;
      grp.add(shoulderMantle);

      // 2. Floating Star-Brooch at the Chest (-Z front)
      this.chestStarBrooch = new THREE.Group();
      this.chestStarBrooch.position.set(0, 1.43, -0.39);
      const broochGem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.125, 0),
        amberLanternMat
      );
      const broochHalo = new THREE.Mesh(
        new THREE.TorusGeometry(0.165, 0.022, 6, 16),
        goldBrassMat
      );
      this.chestStarBrooch.add(broochGem, broochHalo);
      grp.add(this.chestStarBrooch);

      // 3. Pointed Star-Cowl Hood Silhouette + Two Glowing Cyan/Gold Eyes Under Brim
      const cowlGroup = new THREE.Group();
      cowlGroup.position.set(0, 1.84, 0);

      const faceHollow = new THREE.Mesh(
        new THREE.SphereGeometry(0.27, 12, 10),
        darkCowlHollowMat
      );
      faceHollow.position.set(0, -0.02, -0.03);
      cowlGroup.add(faceHollow);

      const cowlCone = new THREE.Mesh(
        new THREE.ConeGeometry(0.43, 0.68, 12),
        primaryMat
      );
      cowlCone.position.set(0, 0.18, 0.06);
      cowlCone.rotation.x = 0.28;
      cowlGroup.add(cowlCone);

      const cowlTipStar = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.08, 0),
        amberLanternMat
      );
      cowlTipStar.position.set(0, 0.5, 0.16);
      cowlGroup.add(cowlTipStar);

      const cowlBrim = new THREE.Mesh(
        new THREE.TorusGeometry(0.29, 0.042, 8, 16, Math.PI),
        goldBrassMat
      );
      cowlBrim.rotation.x = Math.PI * 0.36;
      cowlBrim.rotation.z = Math.PI;
      cowlBrim.position.set(0, 0.05, -0.08);
      cowlGroup.add(cowlBrim);

      for (const sx of [-1, 1]) {
        const outerIris = new THREE.Mesh(
          new THREE.SphereGeometry(0.052, 8, 6),
          eyeCyanMat
        );
        outerIris.scale.set(1.25, 0.82, 0.8);
        outerIris.position.set(sx * 0.105, -0.02, -0.255);

        const innerSpark = new THREE.Mesh(
          new THREE.SphereGeometry(0.028, 6, 6),
          eyeGoldMat
        );
        innerSpark.position.set(sx * 0.105, -0.015, -0.285);
        cowlGroup.add(outerIris, innerSpark);
      }
      grp.add(cowlGroup);

      // 4. Floating Warm Amber Hip-Lantern
      this.hipLantern = new THREE.Group();
      this.hipLantern.position.set(-0.46, 0.98, 0.06);
      const hipBail = new THREE.Mesh(
        new THREE.TorusGeometry(0.09, 0.018, 6, 12),
        goldBrassMat
      );
      const hipCap = new THREE.Mesh(
        new THREE.ConeGeometry(0.14, 0.11, 8),
        goldBrassMat
      );
      hipCap.position.y = -0.08;
      const hipCore = new THREE.Mesh(
        new THREE.SphereGeometry(0.115, 10, 8),
        amberLanternMat
      );
      hipCore.position.y = -0.19;
      const hipGlow = new THREE.Mesh(
        new THREE.SphereGeometry(0.21, 10, 8),
        new THREE.MeshBasicMaterial({
          color: 0xffd166,
          transparent: true,
          opacity: 0.32,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      hipGlow.position.y = -0.19;
      this.hipLantern.add(hipBail, hipCap, hipCore, hipGlow);
      grp.add(this.hipLantern);

      // 5. Articulated Multi-Feather Starlight Cape-Wings (Leading-Edge Spar + 4 Crystal Feather Blades)
      const wingSpanScale = hasGlideWings ? 1.34 : 1.0;
      const featherToonMat = createOddrootToonRimMaterial(this.toonGradientTex, {
        color: trimHex,
        emissive: 0x14b8a6,
        emissiveIntensity: 0.68,
        rimColor: 0xffe599,
        rimIntensity: 0.72,
        transparent: true,
        opacity: 0.86,
      });
      const featherInnerGlowMat = new THREE.MeshBasicMaterial({
        color: 0x80ffea,
        transparent: true,
        opacity: 0.48,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const featherGoldGlowMat = new THREE.MeshBasicMaterial({
        color: 0xffd166,
        transparent: true,
        opacity: 0.44,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      for (const sx of [-1, 1]) {
        const wingGroup = new THREE.Group();
        wingGroup.name = sx < 0 ? "StarlightWingLeft" : "StarlightWingRight";
        wingGroup.position.set(sx * 0.3, 1.44, 0.24);
        wingGroup.rotation.z = sx * 0.18;
        wingGroup.rotation.y = -sx * 0.18;

        const shoulderSocket = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.13, 0),
          goldBrassMat
        );
        wingGroup.add(shoulderSocket);

        // Curved golden/turquoise leading-edge spar
        const sparLen = 1.32 * wingSpanScale;
        const sparArc = new THREE.Mesh(
          new THREE.TorusGeometry(sparLen * 0.64, 0.046, 8, 18, Math.PI * 0.56),
          goldBrassMat
        );
        sparArc.position.set(sx * sparLen * 0.34, -0.34, 0);
        sparArc.rotation.z = sx < 0 ? Math.PI * 0.22 : Math.PI * 0.22;
        if (sx < 0) sparArc.scale.x = -1;
        wingGroup.add(sparArc);

        const sparTipGem = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.095, 0),
          trimMat
        );
        sparTipGem.position.set(sx * sparLen * 0.94, 0.22, 0.04);
        wingGroup.add(sparTipGem);

        // 4 Layered Translucent Glowing Crystal Feather Blades + Additive Inner Glow Trim
        const feathers = [];
        for (let f = 0; f < 4; f++) {
          const fPivot = new THREE.Group();
          const rootOffset = (0.16 + f * 0.21) * wingSpanScale;
          fPivot.position.set(sx * rootOffset, 0.06 - f * 0.05, 0.02 + f * 0.025);

          const bladeLen = (1.36 - f * 0.19) * wingSpanScale;
          const bladeWidth = 0.17 - f * 0.018;

          const crystalBlade = new THREE.Mesh(
            new THREE.CylinderGeometry(0.022, bladeWidth, bladeLen, 4),
            featherToonMat
          );
          crystalBlade.scale.set(1.0, 1.0, 0.26);
          crystalBlade.rotation.z = -sx * (Math.PI * 0.42 - f * 0.13);
          crystalBlade.position.set(
            sx * bladeLen * 0.44,
            -bladeLen * (0.18 + f * 0.08),
            0.04
          );

          const innerGlowTrim = new THREE.Mesh(
            new THREE.CylinderGeometry(0.012, bladeWidth * 0.58, bladeLen * 0.92, 4),
            f % 2 === 0 ? featherInnerGlowMat : featherGoldGlowMat
          );
          innerGlowTrim.scale.set(1.0, 1.0, 0.34);
          innerGlowTrim.rotation.copy(crystalBlade.rotation);
          innerGlowTrim.position.copy(crystalBlade.position);

          fPivot.add(crystalBlade, innerGlowTrim);
          const baseRotZ = -sx * (f * 0.08);
          fPivot.rotation.z = baseRotZ;
          wingGroup.add(fPivot);
          feathers.push({ pivot: fPivot, baseRotZ, index: f });
        }

        grp.add(wingGroup);
        this.gliderWings.push({ mesh: wingGroup, wingGroup, feathers, side: sx });
      }
    }

    if (hasAntlerCrown || cx.silverMoonLantern) {
      const crown = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.055, 8, 24), goldBrassMat);
      crown.rotation.x = Math.PI / 2;
      crown.position.set(0, 2.46, 0);
      grp.add(crown);
    }

    if (hasSporeWake) {
      const wakeCharm = new THREE.Mesh(
        new THREE.TorusGeometry(0.88, 0.05, 8, 24),
        createOddrootToonRimMaterial(this.toonGradientTex, {
          color: 0xc084fc,
          emissive: 0x62f5e4,
          emissiveIntensity: 0.78,
        })
      );
      wakeCharm.rotation.x = Math.PI / 2;
      wakeCharm.position.set(0, 0.18, 0.35);
      grp.add(wakeCharm);
    }

    // Ornate Crescent Moon 3D Siphon-Staff (Spiral Rune Bands + Orbiting Mini Halo Ring)
    this.siphonStaffGroup = new THREE.Group();
    this.siphonStaffGroup.name = "CrescentSiphonStaff";
    this.siphonStaffGroup.position.set(0.62, 1.25, -0.35);

    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.048, 0.066, 2.02, 10),
      saddleWoodMat
    );
    this.siphonStaffGroup.add(shaft);

    // Spiral golden/turquoise rune bands coiled along the shaft
    for (let b = 0; b < 4; b++) {
      const bandY = -0.55 + b * 0.38;
      const runeSpiral = new THREE.Mesh(
        new THREE.TorusGeometry(0.086, 0.018, 6, 16),
        b % 2 === 0 ? goldBrassMat : trimMat
      );
      runeSpiral.position.set(0, bandY, 0);
      runeSpiral.rotation.set(1.05, b * 0.85, 0.35);
      this.siphonStaffGroup.add(runeSpiral);
    }

    const neckCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.075, 0.18, 8),
      goldBrassMat
    );
    neckCollar.position.set(0, 0.78, 0);
    this.siphonStaffGroup.add(neckCollar);

    const crescentRadius = hasWideSiphon ? 0.44 : 0.29;
    const crescent = new THREE.Mesh(
      new THREE.TorusGeometry(crescentRadius, 0.058, 10, 24, Math.PI * 1.48),
      goldBrassMat
    );
    crescent.position.set(0, 1.08, 0);
    crescent.rotation.z = Math.PI * 0.76;
    this.siphonStaffGroup.add(crescent);

    const innerCrescentTrim = new THREE.Mesh(
      new THREE.TorusGeometry(crescentRadius * 0.78, 0.026, 8, 20, Math.PI * 1.32),
      trimMat
    );
    innerCrescentTrim.position.set(0, 1.08, 0);
    innerCrescentTrim.rotation.z = Math.PI * 0.84;
    this.siphonStaffGroup.add(innerCrescentTrim);

    this.siphonTipOrb = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 12, 10),
      createOddrootToonRimMaterial(this.toonGradientTex, {
        color: 0xffcf56,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.88,
      })
    );
    this.siphonTipOrb.position.set(0, 1.08, 0);
    this.siphonStaffGroup.add(this.siphonTipOrb);

    this.siphonTipHalo = new THREE.Mesh(
      new THREE.TorusGeometry(0.26, 0.022, 8, 24),
      trimMat
    );
    this.siphonTipHalo.position.set(0, 1.08, 0);
    this.siphonTipHalo.rotation.x = Math.PI * 0.35;
    this.siphonStaffGroup.add(this.siphonTipHalo);

    if (cx.titanAstrolabeSynced) {
      const pommel = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 8, 18), goldBrassMat);
      pommel.position.set(0, -0.98, 0);
      this.siphonStaffGroup.add(pommel);
    }

    if (cx.clockworkCrestUnlocked) {
      const charm = this._createClockworkCharmMesh(goldBrassMat, trimMat);
      charm.group.position.set(0, 0.56, 0.14);
      this.siphonStaffGroup.add(charm.group);
      this.clockworkCharm = charm.group;
      this.clockworkCharmOuter = charm.outerGear;
      this.clockworkCharmInner = charm.innerGear;
    } else {
      this.clockworkCharm = null;
      this.clockworkCharmOuter = null;
      this.clockworkCharmInner = null;
    }

    grp.add(this.siphonStaffGroup);

    // Companion Crystal Fox
    if (hasCrystalFox) {
      const foxGrp = new THREE.Group();
      foxGrp.position.set(-1.35, 0.48, 0.25);
      const foxBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.38, 6, 10), trimMat);
      foxBody.rotation.x = Math.PI / 2;
      const foxHead = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.34, 8), trimMat);
      foxHead.rotation.x = -Math.PI / 2;
      foxHead.position.set(0, 0.14, -0.34);
      const foxTail = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.42, 7), goldBrassMat);
      foxTail.rotation.x = 0.85;
      foxTail.position.set(0, 0.16, 0.36);
      foxGrp.add(foxBody, foxHead, foxTail);
      grp.add(foxGrp);
      this.companionFox = foxGrp;
    } else {
      this.companionFox = null;
    }

    // Sibling Borrow Starlight Aura Badge
    if (borrowed && (borrowed.ok || borrowed.owner || borrowed.displayName)) {
      const borrowAura = new THREE.Mesh(
        new THREE.TorusGeometry(1.45, 0.06, 8, 28),
        new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.72 })
      );
      borrowAura.rotation.x = Math.PI / 2;
      borrowAura.position.y = 0.25;
      grp.add(borrowAura);
      grp.userData.borrowedFrom = borrowed.owner || borrowed.displayName || "sibling";
    } else {
      grp.userData.borrowedFrom = null;
    }

    grp.userData.mountId = normMount;
    grp.userData.goldenMosaicTrim = Boolean(cx.goldenMosaicTrimUnlocked);
    grp.userData.auroraTrim = Boolean(cx.auroraBladeTrimUnlocked);
    grp.userData.clockworkCharm = Boolean(cx.clockworkCrestUnlocked);

    grp.position.set(this.rigState.x, this.rigState.y, this.rigState.z);
    grp.rotation.y = this.rigState.heading;
    this.scene.add(grp);
    this.avatarGroup = grp;
    this.rigGroup = grp;
    return grp;
  }

  _createClockworkCharmMesh(goldBrassMat, trimMat) {
    const group = new THREE.Group();
    group.name = "oddroot_clockwork_charm";

    const outerGear = new THREE.Group();
    outerGear.add(new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.036, 8, 20), goldBrassMat));
    for (let t = 0; t < 8; t++) {
      const ang = (t / 8) * Math.PI * 2;
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.085, 0.045), goldBrassMat);
      tooth.position.set(Math.cos(ang) * 0.27, Math.sin(ang) * 0.27, 0);
      tooth.rotation.z = ang;
      outerGear.add(tooth);
    }
    group.add(outerGear);

    const innerGear = new THREE.Group();
    innerGear.add(new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.025, 8, 16), trimMat));
    for (let t = 0; t < 6; t++) {
      const ang = (t / 6) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.24, 0.035), goldBrassMat);
      spoke.rotation.z = ang;
      innerGear.add(spoke);
    }
    innerGear.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 0), trimMat));
    group.add(innerGear);

    return { group, outerGear, innerGear };
  }

  rebuildRig(mountId, upgrades) {
    return this.rebuildAvatar(mountId, upgrades);
  }

  setMountMode(mountId) {
    const next = normalizeMountId(mountId);
    this.rebuildAvatar(next, this.rigState.upgrades);
    this.audio?.playSiphonPop?.(1.1);
    return next;
  }

  toggleMountMode() {
    const next =
      this.rigState.mountId === "bramble_boar" ? "starlight_glider" : "bramble_boar";
    return this.setMountMode(next);
  }

  setObservatoryTier(tier = 1) {
    const clamped = Math.max(1, Math.min(6, Math.round(Number(tier) || 1)));
    this.rigState.observatoryTier = clamped;
    for (let i = 0; i < this.observatoryRings.length; i++) {
      const isLit = i < clamped;
      this.observatoryRings[i].mat.emissiveIntensity = isLit ? 0.95 : 0.12;
    }
  }

  setSurgeMode(inSurge) {
    this.rigState.inSurge = Boolean(inSurge);
    if (this.canopyMat) {
      this.canopyMat.emissiveIntensity = this.rigState.inSurge ? 0.85 : 0.45;
    }
  }

  getSlipstreamBoostState() {
    if (!this.slipstreamVfx) {
      return { active: false, ratio: 0, multiplier: 1, overdrive: false };
    }
    return {
      active: this.slipstreamVfx.isActive(),
      ratio: this.slipstreamVfx.getRemainingRatio(),
      multiplier: this.slipstreamVfx.getSpeedMultiplier(),
      overdrive: Boolean(this.slipstreamVfx.overdriveActive),
    };
  }

  setZoneProgressRatio(ratio) {
    this.horizonWonder?.setZoneProgress(ratio);
  }

  getActiveBiome() {
    return resolveActiveBiome("oddroot", this.rigState.x, this.rigState.z);
  }

  getFieldExpeditionState() {
    if (!this.fieldExpedition) {
      this.fieldExpedition = createFieldExpeditionState("oddroot", 0);
    }
    return this.fieldExpedition;
  }

  getRobloxSimSnapshot() {
    const timeScaleState = computeSimulationTimeScale({
      dt: this._lastSimDt || 1 / 60,
      encounterDockOpen: this.encounterDockOpen,
      activeGateSlot: Boolean(this.activeGateSlot || this._gateAutoPause),
      bulletTimeRequested: Boolean(this.bulletTimeRequested),
      realmId: "oddroot",
    });
    this.simTimeState = timeScaleState;
    return exportRobloxSimSnapshot({
      realmId: "oddroot",
      vehicleState: this.rigState,
      timeScaleState,
      expeditionState: this.getFieldExpeditionState(),
    });
  }

  _stepOuterArchipelagoBiomes(dt, pausedForMath) {
    const t = this.elapsedTime;

    for (const pool of this.grottoLagoonPools || []) {
      const cycle = (t * 0.44 + pool.phase) % 1;
      pool.rippleMesh.scale.setScalar(0.75 + cycle * 1.15);
      pool.rippleMat.opacity = 0.52 * (1 - cycle);
      pool.waterMat.opacity = 0.72 + Math.sin(t * 2.1 + pool.phase) * 0.08;
    }

    for (const sc of this.grottoSporeCaps || []) {
      const pulse = 1.0 + Math.sin(t * 2.2 + sc.phase) * 0.05;
      sc.capDome.scale.set(pulse, 1.0 + Math.cos(t * 2.2 + sc.phase) * 0.04, pulse);
      sc.capMat.emissiveIntensity = 0.68 + Math.sin(t * 2.6 + sc.phase) * 0.16;
      sc.gillRing.rotation.z = t * 0.65 + sc.phase;
    }

    if (this.skyrootSpireCrown) {
      this.skyrootSpireCrown.rotation.y = t * 1.8;
      this.skyrootSpireCrown.position.y = 9.4 + Math.sin(t * 2.6) * 0.25;
    }
    if (this.skyrootSpireHalo) {
      this.skyrootSpireHalo.rotation.z = t * 2.2;
      this.skyrootSpireHalo.rotation.y = -t * 1.3;
    }

    for (const ring of this.skyrootWindRings || []) {
      if (ring.cooldown > 0) {
        ring.cooldown = Math.max(0, ring.cooldown - dt);
      }
      ring.outerRing.rotation.z = t * 2.1 + ring.index;
      ring.innerRing.rotation.z = -t * 3.4 - ring.index;
      ring.outerMat.emissiveIntensity = 0.85 + Math.sin(t * 4.2 + ring.index) * 0.2;

      if (!pausedForMath && !this.rigAnim && !this.autopilotTarget && ring.cooldown <= 0) {
        const dRing = Math.hypot(this.rigState.x - ring.x, this.rigState.z - ring.z);
        if (dRing <= ring.radius) {
          ring.cooldown = 6.5;
          this._skyrootLiftTimer = 0.88;
          this.rigState.glidingAirborne = true;
          this.rigState.y += 0.65;
          if (this.avatarGroup) {
            this.avatarGroup.position.y = this.rigState.y;
          }
          this.rigState.speed = Math.max(Number(this.rigState.speed) || 0, 15.2);
          this.slipstreamVfx?.triggerClearBoost({
            x: this.rigState.x,
            y: this.rigState.y,
            z: this.rigState.z,
            overdrive: false,
          });
          if (typeof this.audio?.playWindRingBoost === "function") {
            this.audio.playWindRingBoost();
          } else {
            this.audio?.playUpdraftLift?.();
          }
          this.onOppositionEvent?.({
            type: "skyroot_wind_ring",
            kind: "skyroot_wind_ring",
            shardsEarned: 3,
            message: "🌬️ Sky-Root Wind Ring! +3💎",
          });
        }
      }
    }
  }

  _stepFieldExpedition(dt) {
    const t = this.elapsedTime;
    if (!this.fieldExpedition) {
      this.fieldExpedition = createFieldExpeditionState("oddroot", 0);
      this._syncExpeditionBeacons();
    }

    for (const slot of this.expeditionBeacons || []) {
      if (!slot.group.visible) continue;
      slot.outerRing.rotation.z = t * 1.5 + slot.index;
      slot.innerRing.rotation.z = -t * 2.1 - slot.index;
      slot.innerRing.position.y = 1.15 + Math.sin(t * 3.2 + slot.index) * 0.22;
      slot.crownGem.rotation.y = t * 2.8 + slot.index;
      slot.crownGem.position.y = 2.35 + Math.sin(t * 3.8 + slot.index) * 0.26;
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
      !this._gateAutoPause &&
      !this.rigAnim &&
      !this.autopilotTarget
    ) {
      const res = stepFieldExpedition(this.fieldExpedition, this.rigState.x, this.rigState.z);
      this.fieldExpedition = res.state;
      if (res.justCollectedWaypoint) {
        const wp = res.justCollectedWaypoint;
        this._triggerExpeditionBurst(wp.x, this._groundHeightAt(wp.x, wp.z) + 0.1, wp.z);
        this._syncExpeditionBeacons();

        if (res.justCompletedExpedition) {
          if (typeof this.audio?.playExpeditionComplete === "function") {
            this.audio.playExpeditionComplete();
          } else {
            this.audio?.playClear?.(false);
          }
          this.onWorldActivity(1, res.shardsEarned, "expeditionsCompleted");
          this._persistOddrootProgressMutation((oddState) => {
            oddState.expeditionsCompleted = res.state.completedTotal;
          });
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
            this.audio?.playSiphonPop?.(1.18);
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

  triggerGuardianAwakening(worldId = "W1") {
    this.guardianAnim = { worldId, t: 0, dur: 3.6 };
    this.audio?.playGuardianAwakening?.();
    this.blightSystem.triggerElixirPushbackWave(0, 0.5, -4.5, true, this.menagerie, {
      audio: this.audio,
      onWorldActivity: this.onWorldActivity,
      onOppositionEvent: this.onOppositionEvent,
    });
  }

  // Live 2-Player Multiplayer Co-Op Hooks (F21)
  getLocalMultiplayerPose() {
    return {
      x: this.rigState.x,
      y: this.rigState.y,
      z: this.rigState.z,
      heading: this.rigState.heading,
      speed: this.rigState.speed,
      chassisOrMount: this.rigState.mountId,
    };
  }

  syncRemotePartners(peersArray = []) {
    this.coop.syncRemotePartners(peersArray);
  }

  playPartnerCoopEvent(event = {}) {
    return this.coop.playPartnerCoopEvent(event);
  }

  playLocalFlare() {
    return this.coop.playLocalFlare(this.rigState);
  }

  syncSharedCoins(coinStatesMap = {}) {
    this.coop.syncSharedCoins(coinStatesMap);
  }

  // Traversal & Siphon Quick Actions
  setDriveInputs(steer = 0, throttle = 0, boosting = false) {
    const numS = Number(steer);
    const numT = Number(throttle);
    const s = Number.isFinite(numS) ? Math.max(-1, Math.min(1, numS)) : 0;
    const t = Number.isFinite(numT) ? Math.max(-1, Math.min(1, numT)) : 0;
    this.rigState.steerInput = s;
    this.rigState.throttleInput = t;
    this.rigState.boosting = Boolean(boosting);
    if (Math.abs(s) > 0.05 || Math.abs(t) > 0.05) {
      this.autopilotTarget = null;
    }
  }

  _classifyArchipelagoIsland(x, z) {
    let best = SANCTUARY_ISLANDS[0];
    let bestMargin = Infinity;
    for (const isl of SANCTUARY_ISLANDS) {
      const margin = Math.hypot(x - isl.x, z - isl.z) - isl.radius;
      if (margin < bestMargin) {
        bestMargin = margin;
        best = isl;
      }
    }
    return { id: best.id, margin: bestMargin };
  }

  _findIslandRoute(fromId, toId) {
    if (fromId === toId) return [fromId];
    const queue = [[fromId]];
    const visited = new Set([fromId]);
    while (queue.length > 0) {
      const path = queue.shift();
      const last = path[path.length - 1];
      for (const nxt of AUTOPILOT_ISLAND_ADJ[last] || []) {
        if (nxt === toId) return [...path, nxt];
        if (!visited.has(nxt)) {
          visited.add(nxt);
          queue.push([...path, nxt]);
        }
      }
    }
    return [fromId, "center", toId];
  }

  _buildAutopilotWaypoints(sx, sz, tx, tz) {
    const startInfo = this._classifyArchipelagoIsland(sx, sz);
    const endInfo = this._classifyArchipelagoIsland(tx, tz);
    const waypoints = [];

    if (startInfo.margin > 0.1) {
      for (const br of SANCTUARY_BRIDGES) {
        const abx = br.bx - br.ax;
        const abz = br.bz - br.az;
        const lenSq = abx * abx + abz * abz || 1;
        const t = Math.max(0, Math.min(1, ((sx - br.ax) * abx + (sz - br.az) * abz) / lenSq));
        const cx = br.ax + abx * t;
        const cz = br.az + abz * t;
        if (Math.hypot(sx - cx, sz - cz) <= br.width * 0.5 + 0.6) {
          const islA = this._classifyArchipelagoIsland(br.ax, br.az).id;
          const islB = this._classifyArchipelagoIsland(br.bx, br.bz).id;
          if (islA === startInfo.id) waypoints.push({ x: br.ax, z: br.az });
          else if (islB === startInfo.id) waypoints.push({ x: br.bx, z: br.bz });
          break;
        }
      }
    }

    if (startInfo.id === endInfo.id) {
      waypoints.push({ x: tx, z: tz });
      return waypoints;
    }

    const islRoute = this._findIslandRoute(startInfo.id, endInfo.id);
    for (let i = 0; i < islRoute.length - 1; i++) {
      const fromIsl = islRoute[i];
      const toIsl = islRoute[i + 1];
      const mouths = AUTOPILOT_BRIDGE_TRANSITIONS[`${fromIsl}->${toIsl}`] || [];
      for (const m of mouths) {
        waypoints.push({ x: m.x, z: m.z });
      }
      if (i < islRoute.length - 2) {
        if (toIsl === "center") {
          waypoints.push({ x: 0, z: -6.0 });
        } else if (toIsl === "west") {
          waypoints.push({ x: -23.5, z: -9.5 });
        } else if (toIsl === "east") {
          waypoints.push({ x: 23.5, z: -9.5 });
        }
      }
    }
    waypoints.push({ x: tx, z: tz });
    return waypoints;
  }

  engageAutopilotToNextGate() {
    let bestSlot = null;
    let bestDist = Infinity;
    const sx = Number.isFinite(this.rigState.x) ? this.rigState.x : 0;
    const sz = Number.isFinite(this.rigState.z) ? this.rigState.z : 22;

    const openSlots = this.gateSlots.filter((s) => !s.cleared);
    if (!openSlots.length) {
      this.autopilotTarget = null;
      return null;
    }

    if (openSlots[0].encounter?.worldId === "W0") {
      const slot = openSlots[0];
      const ax = slot.x + Math.sin(slot.rotY) * 6.0;
      const az = slot.z + Math.cos(slot.rotY) * 6.0;
      this.autopilotTarget = {
        x: ax,
        z: az,
        slot,
        waypoints: this._buildAutopilotWaypoints(sx, sz, ax, az),
        wpIndex: 0,
      };
      return slot;
    }

    for (const slot of openSlots) {
      const ax = slot.x + Math.sin(slot.rotY) * 6.0;
      const az = slot.z + Math.cos(slot.rotY) * 6.0;
      const d = Math.hypot(ax - sx, az - sz);
      if (d < bestDist) {
        bestDist = d;
        bestSlot = {
          x: ax,
          z: az,
          slot,
          waypoints: this._buildAutopilotWaypoints(sx, sz, ax, az),
          wpIndex: 0,
        };
      }
    }
    this.autopilotTarget = bestSlot;
    return bestSlot ? bestSlot.slot : null;
  }

  engageAutopilotToNextShrine() {
    return this.engageAutopilotToNextGate();
  }

  getSiphonRadius() {
    return this.blightSystem
      ? this.blightSystem.getSiphonRadius(this.rigState.upgradesSet)
      : BASE_SIPHON_RADIUS;
  }

  fireSiphonOrb(speciesId = "sun_orb", targetPosVec3 = null, duration = 0.52) {
    const spec = SIPHON_ORB_SPECS[speciesId] || SIPHON_ORB_SPECS.sun_orb;
    const key = spec.id;
    const slot =
      this.siphonProjectiles.find((p) => !p.active) || this.siphonProjectiles[0];

    const rx = Number.isFinite(Number(this.rigState.x)) ? Number(this.rigState.x) : 0;
    const ry = Number.isFinite(Number(this.rigState.y)) ? Number(this.rigState.y) : 0.95;
    const rz = Number.isFinite(Number(this.rigState.z)) ? Number(this.rigState.z) : 22;
    const rh = Number.isFinite(Number(this.rigState.heading)) ? Number(this.rigState.heading) : 0;

    this.avatarGroup.updateMatrixWorld(true);
    const startWorld = new THREE.Vector3();
    if (this.siphonTipOrb) {
      this.siphonTipOrb.getWorldPosition(startWorld);
    } else {
      startWorld.set(rx, ry + 1.5, rz);
    }
    if (
      !Number.isFinite(startWorld.x) ||
      !Number.isFinite(startWorld.y) ||
      !Number.isFinite(startWorld.z)
    ) {
      startWorld.set(rx, ry + 1.5, rz);
    }

    const fwdX = -Math.sin(rh);
    const fwdZ = -Math.cos(rh);
    const defaultEndX = rx + fwdX * 8.5;
    const defaultEndY = ry + 1.2;
    const defaultEndZ = rz + fwdZ * 8.5;

    const hasTargetObj = targetPosVec3 !== null && typeof targetPosVec3 === "object";
    const tx =
      hasTargetObj && Number.isFinite(Number(targetPosVec3.x))
        ? Number(targetPosVec3.x)
        : defaultEndX;
    const ty =
      hasTargetObj && Number.isFinite(Number(targetPosVec3.y))
        ? Number(targetPosVec3.y)
        : hasTargetObj
        ? 1.5
        : defaultEndY;
    const tz =
      hasTargetObj && Number.isFinite(Number(targetPosVec3.z))
        ? Number(targetPosVec3.z)
        : defaultEndZ;
    const endWorld = new THREE.Vector3(tx, ty, tz);

    const rawDur = Number(duration);
    const safeDur =
      Number.isFinite(rawDur) && rawDur > 0 ? Math.max(0.15, Math.min(10.0, rawDur)) : 0.52;

    slot.active = true;
    slot.speciesId = key;
    slot.elapsed = 0;
    slot.duration = safeDur;
    slot.startPos.copy(startWorld);
    slot.targetPos.copy(endWorld);
    slot.arcHeight = spec.arcHeight;
    slot.buoyantLift = spec.buoyantLift;
    slot.mesh.geometry = this._siphonGeos[key];
    slot.mesh.material = this._siphonMats[key];
    slot.mesh.position.copy(startWorld);
    slot.mesh.visible = true;

    this.audio?.playSiphonPop?.(key === "helium_puff" ? 1.25 : 1.0);
    return slot;
  }

  triggerRealmQuickAction() {
    let regrown = 0;
    for (const th of this.thickets) {
      if (!th.active) {
        th.active = true;
        th.regrowSec = 0;
        regrown++;
      }
    }
    if (regrown > 0) {
      this._syncThicketInstances();
    }

    const vac = this.blightSystem.vacuumSporesAt(
      this.rigState.x,
      this.rigState.z,
      this.rigState.upgradesSet,
      this.rigState.siphonOrbs,
      this.menagerie,
      {
        audio: this.audio,
        onWorldActivity: this.onWorldActivity,
        onOppositionEvent: this.onOppositionEvent,
      }
    );

    this.audio?.playSiphonPop?.(1.12);
    return {
      purifiedSpores: vac.purifiedCount,
      siphonRadius: vac.radius,
      thicketsRegrown: regrown,
    };
  }

  resetFreshSnow() {
    return this.triggerRealmQuickAction();
  }

  // Spatial Math Encounters
  populateEncounters(waveArray = []) {
    const slots = this.shrines.populateEncounters(waveArray, SHRINE_ANCHORS);
    this.gateSlots = slots;
    this.shrineSlots = slots;
    this.activeGateSlot = null;
    this._gateAutoPause = false;
    this.currentRunFrames = [];
    this.waveElapsedSec = 0;
    this._ghostRecordAccum = 0;
    this._waveCompletionChecked = false;
    return slots;
  }

  areAllEncountersCleared() {
    return this.shrines.areAllEncountersCleared();
  }

  _resolveEncounterSlot(enc = null, preferUncleared = false) {
    if (enc) {
      const matched = this.gateSlots.find(
        (s) => s.encounter === enc || (enc.uid && s.encounter?.uid === enc.uid)
      );
      if (matched) return matched;
    }
    if (this.activeGateSlot) return this.activeGateSlot;
    if (preferUncleared) {
      return this.gateSlots.find((s) => !s.cleared) || this.gateSlots[0] || null;
    }
    return this.gateSlots[0] || null;
  }

  _revealMenagerieCreature(speciesId, minStage = 1, nearSlot = null) {
    if (!this.menagerie) return null;
    let targetPos = null;
    if (nearSlot) {
      const sample = this._sampleArchipelago(
        nearSlot.x + Math.sin(nearSlot.rotY) * 2.8 + Math.cos(nearSlot.rotY) * 2.2,
        nearSlot.z + Math.cos(nearSlot.rotY) * 2.8 - Math.sin(nearSlot.rotY) * 2.2
      );
      targetPos = { x: sample.safeX, y: sample.safeY, z: sample.safeZ };
    }

    const entry = this.menagerie.revealSpeciesInWorld(speciesId, targetPos, {
      minStage,
      exactAnchor: Boolean(targetPos),
      onCreatureHatched: (hatchedSpec) => {
        this.audio?.playCreatureHatch?.(hatchedSpec.stage);
        this.onCreatureHatched(hatchedSpec);
      },
    });
    if (!entry) return null;

    this._persistOddrootProgressMutation((oddState) => {
      const list = Array.isArray(oddState.hatchedCreatures)
        ? [...oddState.hatchedCreatures]
        : [];
      if (!list.includes(entry.id)) {
        list.push(entry.id);
      }
      oddState.hatchedCreatures = list;
      const stages =
        oddState.creatureStages && typeof oddState.creatureStages === "object"
          ? { ...oddState.creatureStages }
          : {};
      stages[entry.id] = Math.max(Math.floor(Number(stages[entry.id]) || 0), entry.stage);
      oddState.creatureStages = stages;
    });

    return entry;
  }

  refreshActiveEncounterVisual(encounter) {
    const targetSlot = this._resolveEncounterSlot(encounter, false);
    if (!targetSlot) return;
    this.shrines.refreshActiveEncounterVisual(targetSlot, encounter, this.dialPreviewValue);
  }

  updateDialPreview(numericValue) {
    const safeVal = Number.isFinite(Number(numericValue)) ? Number(numericValue) : 0;
    this.dialPreviewValue = safeVal;
    if (this.siphonTipOrb) {
      this.siphonTipOrb.material.color.setHex(safeVal < 0 ? 0x4ad8ff : 0xffcf56);
    }
    const targetSlot =
      this.activeGateSlot || this.gateSlots.find((s) => !s.cleared) || this.gateSlots[0] || null;
    if (targetSlot) {
      this.shrines.updateDialPreview(targetSlot, safeVal);
    }
  }

  playTwinBeamVisual(isRepel = false) {
    const targetSlot =
      this.activeGateSlot || this.gateSlots.find((s) => !s.cleared) || this.gateSlots[0] || null;
    if (!targetSlot) return;
    this.avatarGroup.updateMatrixWorld(true);
    const tipWorld = new THREE.Vector3();
    if (this.siphonTipOrb) {
      this.siphonTipOrb.getWorldPosition(tipWorld);
    } else {
      tipWorld.set(this.rigState.x, this.rigState.y + 1.5, this.rigState.z);
    }
    this.shrines.playTwinBeamVisual(targetSlot, tipWorld, Boolean(isRepel));
  }

  _pickSafeRelicDropCoord() {
    const candidates = [
      { x: 0, z: 7.2 },
      { x: 0, z: -9.8 },
      { x: -7.6, z: 3.2 },
      { x: 7.6, z: 3.2 },
      { x: -19.5, z: -8.5 },
      { x: 19.5, z: -8.5 },
      { x: 4.8, z: -26.5 },
    ];
    let chosen = candidates[1];
    let bestDist = Infinity;
    for (const c of candidates) {
      const d = Math.hypot(c.x - this.rigState.x, c.z - this.rigState.z);
      if (d >= 5.5 && d < bestDist) {
        bestDist = d;
        chosen = c;
      }
    }
    return {
      dropX: chosen.x,
      dropY: this._groundHeightAt(chosen.x, chosen.z) + 0.2,
      dropZ: chosen.z,
    };
  }

  playCommitVisual(commitResult = {}, enc = null) {
    if (commitResult?.invalidInput) {
      return {
        cleared: false,
        invalidInput: true,
        outcome: commitResult.outcome || "nudge",
      };
    }

    const targetSlot = this._resolveEncounterSlot(enc, true);
    if (!targetSlot) return null;

    const conseq = this.shrines.playCommitVisual(targetSlot, commitResult, enc);
    if (!conseq) return null;

    if (conseq.cleared) {
      if (!this.activeGateSlot || this.activeGateSlot === targetSlot) {
        this.activeGateSlot = null;
        this._gateAutoPause = false;
      }

      if (conseq.outcome === "warm_reveal") {
        this.audio?.playFoxReveal?.();
        this._revealMenagerieCreature("crystal_fox", 1, targetSlot);
      } else {
        this.audio?.playClear?.(Boolean(conseq.overdrive));
      }

      this.slipstreamVfx?.triggerClearBoost({
        x: this.rigState.x,
        y: this.rigState.y,
        z: this.rigState.z,
        overdrive: Boolean(conseq.overdrive),
      });
      this.audio?.playSlipstreamBoost?.(Boolean(conseq.overdrive));
      if (!this.autopilotTarget) {
        this.rigState.speed = Math.max(
          this.rigState.speed,
          conseq.overdrive ? 12.5 : 10.2
        );
      }
      this.horizonWonder?.notifyTempleCleared(this._pickSafeRelicDropCoord());

      if (conseq.pushbackWave) {
        this.blightSystem.triggerElixirPushbackWave(
          conseq.pushbackWave.x,
          conseq.pushbackWave.y,
          conseq.pushbackWave.z,
          conseq.pushbackWave.overdrive,
          this.menagerie,
          {
            audio: this.audio,
            onWorldActivity: this.onWorldActivity,
            onOppositionEvent: this.onOppositionEvent,
          }
        );
      }

      if (conseq.subZeroClear) {
        const toad = this.menagerie.triggerSubZeroToadAscent(conseq.answerVal, {
          onCreatureHatched: this.onCreatureHatched,
        });
        if (toad) {
          this._persistOddrootProgressMutation((oddState) => {
            const list = Array.isArray(oddState.hatchedCreatures)
              ? [...oddState.hatchedCreatures]
              : [];
            if (!list.includes("zero_g_toad")) list.push("zero_g_toad");
            oddState.hatchedCreatures = list;
            const stages =
              oddState.creatureStages && typeof oddState.creatureStages === "object"
                ? { ...oddState.creatureStages }
                : {};
            stages.zero_g_toad = Math.max(
              Math.floor(Number(stages.zero_g_toad) || 0),
              toad.stage || 1
            );
            oddState.creatureStages = stages;
          });
        }
      }

      if (conseq.mysteryId) {
        if (conseq.mysteryId === "astrolabe_lock") {
          this._revealMenagerieCreature("eclipse_stag", 3, targetSlot);
        }
        this.onMysteryFound(conseq.mysteryId);
      }

      if (conseq.mosaicForged) {
        this.rigState.mosaicForged = true;
        this._persistOddrootProgressMutation((oddState) => {
          oddState.mosaicForged = true;
        });
        this._revealMenagerieCreature("crystal_fox", 3, targetSlot);
      }

      if (conseq.playerAnim) {
        this.rigAnim = conseq.playerAnim;
      }

      this._checkWavePersonalBest();
    }

    return conseq;
  }

  _checkWavePersonalBest() {
    if (this._waveCompletionChecked || !this.areAllEncountersCleared()) return;
    this._waveCompletionChecked = true;
    const runSec = Number(Math.max(0.1, this.waveElapsedSec).toFixed(2));
    const prevBest = Number(
      this.ghostBest?.durationSec ?? this.ghostBest?.bestWaveSec ?? Infinity
    );
    if (!this.ghostBest || !Number.isFinite(prevBest) || runSec < prevBest) {
      const framesCopy = [...this.currentRunFrames];
      this.ghostBest = {
        bestWaveSec: runSec,
        durationSec: runSec,
        frames: framesCopy,
      };
      this._persistOddrootProgressMutation((oddState) => {
        oddState.bestCircuitSec = runSec;
        oddState.ghostFrames = [...framesCopy];
        oddState.ghostBest = {
          bestWaveSec: runSec,
          durationSec: runSec,
          frames: [...framesCopy],
        };
      });
      this.onOppositionEvent({
        kind: "personal_record",
        shardsEarned: 3,
        message: "NEW PERSONAL RECORD! 🏆",
      });
    }
  }

  triggerOverdriveStreakWonder() {
    this.whaleTimer = 11.0;
    this.skyWhale.visible = true;
    this._revealMenagerieCreature("starlight_whale", 1, null);
    this.audio?.playWhaleSong?.();
    this.onMysteryFound("aurora_whale");
  }

  triggerSkyWhale() {
    this.triggerOverdriveStreakWonder();
  }

  // Rolling 60fps Automatic DPR Governor (0.85..2.0 with hysteresis)
  _updateDprGovernor(rawDt) {
    if (!this.webglAvailable || !this.renderer) return;
    const numDt = Number(rawDt);
    if (!Number.isFinite(numDt) || numDt <= 0) return;

    const frameMs = Math.max(4, Math.min(100, numDt * 1000));
    this.dprGovernor.emaFrameMs = this.dprGovernor.emaFrameMs * 0.9 + frameMs * 0.1;

    if (this.dprGovernor.cooldownSec > 0) {
      this.dprGovernor.cooldownSec = Math.max(
        0,
        this.dprGovernor.cooldownSec - Math.min(2.0, numDt)
      );
      return;
    }

    const dt = Math.min(0.05, numDt);
    if (this.dprGovernor.emaFrameMs > 22.0) {
      this.dprGovernor.highLoadSec += dt;
      this.dprGovernor.lowLoadSec = 0;
      if (this.dprGovernor.highLoadSec >= 0.8 && this.dprGovernor.currentDpr > this.dprGovernor.minDpr) {
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
      if (this.dprGovernor.lowLoadSec >= 2.0 && this.dprGovernor.currentDpr < this.dprGovernor.maxDpr) {
        this.dprGovernor.currentDpr = Math.min(
          this.dprGovernor.maxDpr,
          Number((this.dprGovernor.currentDpr + 0.1).toFixed(2))
        );
        this.renderer.setPixelRatio(this.dprGovernor.currentDpr);
        this.dprGovernor.lowLoadSec = 0;
        this.dprGovernor.cooldownSec = 2.0;
      }
    } else {
      this.dprGovernor.highLoadSec = 0;
      this.dprGovernor.lowLoadSec = 0;
    }
  }

  // Deterministic Frame Step (invoked by requestAnimationFrame AND headless Node tests)
  step(rawDt = 1 / 60) {
    const numDt = Number(rawDt);
    const safeRawDt = Number.isFinite(numDt) && numDt >= 0 ? numDt : 0;
    const dt = Math.min(0.05, safeRawDt);
    this.elapsedTime += dt;
    this._updateDprGovernor(rawDt);
    this._update(dt);

    if (this.webglAvailable && this.renderer) {
      this.renderer.render(this.scene, this.camera);
    }
    return dt;
  }

  _update(dt) {
    this._lastSimDt = dt;
    // 1. Active Cinematic Animations (Vine Grind or Updraft Cushion Lift)
    if (
      this.rigAnim &&
      this.rigAnim.kind === "updraft_lift" &&
      Number.isFinite(this.rigAnim.lastX) &&
      Math.hypot(this.rigState.x - this.rigAnim.lastX, this.rigState.z - this.rigAnim.lastZ) > 1.2
    ) {
      this.rigAnim = null;
    }

    if (this.rigAnim) {
      this._skyrootLiftTimer = 0;
      this.rigAnim.t += dt;
      const p = Math.min(1, this.rigAnim.t / Math.max(0.1, this.rigAnim.dur));

      if (this.rigAnim.kind === "updraft_lift") {
        const { startX, startY, startZ, endX, endY, endZ } = this.rigAnim;
        this.rigState.x = startX + (endX - startX) * p;
        this.rigState.z = startZ + (endZ - startZ) * p;
        this.rigState.y =
          startY + (endY - startY) * p + Math.sin(p * Math.PI) * 3.2;
        this.rigState.speed = 0;
        this.rigAnim.lastX = this.rigState.x;
        this.rigAnim.lastZ = this.rigState.z;
      } else if (this.rigAnim.kind === "grind_vine" && this.rigAnim.slot) {
        const s = this.rigAnim.slot;
        const fwdX = -Math.sin(s.rotY);
        const fwdZ = -Math.cos(s.rotY);
        const travel = (p - 0.5) * 10.0;
        this.rigState.x = s.x + fwdX * travel;
        this.rigState.z = s.z + fwdZ * travel + 4.5;
        this.rigState.y = s.y + 1.4 + Math.sin(p * Math.PI) * 2.4;
      }

      if (p >= 1) {
        const wasGrindVine = this.rigAnim.kind === "grind_vine";
        if (wasGrindVine && this.rigAnim.slot) {
          const s = this.rigAnim.slot;
          const sample = this._sampleArchipelago(s.x, s.z + 5.5);
          this.rigState.x = sample.safeX;
          this.rigState.z = sample.safeZ;
          this.rigState.y = sample.safeY + 0.55;
        }
        this.rigAnim = null;
        if (wasGrindVine && !this.autopilotTarget && this.slipstreamVfx?.isActive()) {
          this.rigState.speed = 9.8;
        }
        if (this.autopilotTarget && this.autopilotTarget.slot && !this.autopilotTarget.slot.cleared) {
          this.autopilotTarget.waypoints = this._buildAutopilotWaypoints(
            this.rigState.x,
            this.rigState.z,
            this.autopilotTarget.x,
            this.autopilotTarget.z
          );
          this.autopilotTarget.wpIndex = 0;
        }
      }
    } else {
      this._stepAvatarMovement(dt);
    }

    const speedMag = Math.abs(this.rigState.speed);
    const slipActive = Boolean(this.slipstreamVfx?.isActive());

    // Subtle graceful banking on avatarGroup.rotation.z when steering
    const activeSteer = this.rigAnim ? 0 : Number(this._lastActiveSteer ?? this.rigState.steerInput) || 0;
    const targetBank = Math.max(
      -0.28,
      Math.min(0.28, activeSteer * 0.24 * Math.min(1, speedMag / 5.5))
    );
    this._avatarBankRad =
      (this._avatarBankRad || 0) +
      (targetBank - (this._avatarBankRad || 0)) * (1 - Math.exp(-10 * dt));

    this.avatarGroup.position.set(this.rigState.x, this.rigState.y, this.rigState.z);
    this.avatarGroup.rotation.y = this.rigState.heading;
    this.avatarGroup.rotation.z = this._avatarBankRad;
    this._stepSporeLilyWake(dt);

    // Animate mount legs, wagging boar tail, multi-feather glider wings & staff halo
    for (let i = 0; i < this.boarLegs.length; i++) {
      this.boarLegs[i].rotation.x =
        Math.sin(this.elapsedTime * 12 * Math.min(1.5, speedMag / 10) + i * Math.PI * 0.5) *
        0.45 *
        Math.min(1, speedMag / 4);
    }
    if (this.boarTailPivot) {
      this.boarTailPivot.rotation.y =
        Math.sin(this.elapsedTime * (7.5 + Math.min(8.0, speedMag * 0.55))) * 0.42;
    }

    const unfurlAmount =
      (this.rigState.glidingAirborne ? 0.34 : 0) +
      (this.rigState.boosting ? 0.22 : 0) +
      (slipActive ? 0.3 : 0);
    for (const w of this.gliderWings) {
      const flapAmp = this.rigState.glidingAirborne || slipActive ? 0.24 : 0.08;
      w.mesh.rotation.z =
        w.side * (0.18 + unfurlAmount * 0.32 + Math.sin(this.elapsedTime * 5.2) * flapAmp);
      w.mesh.rotation.y =
        -w.side * Math.max(0.03, 0.2 - unfurlAmount * 0.26);

      if (w.feathers) {
        for (const f of w.feathers) {
          const ripple =
            Math.sin(this.elapsedTime * 6.4 - f.index * 0.55) *
            (0.035 + unfurlAmount * 0.05);
          f.pivot.rotation.z =
            f.baseRotZ + w.side * (unfurlAmount * f.index * 0.085 + ripple);
        }
      }
    }

    if (this.hipLantern) {
      this.hipLantern.rotation.z =
        Math.sin(this.elapsedTime * 3.4) * 0.12 - this._avatarBankRad * 0.65;
      this.hipLantern.rotation.x =
        Math.cos(this.elapsedTime * 2.7) * 0.08 + Math.min(0.24, speedMag * 0.015);
    }
    if (this.siphonTipHalo) {
      this.siphonTipHalo.rotation.y = this.elapsedTime * 2.4;
      this.siphonTipHalo.rotation.z = Math.sin(this.elapsedTime * 1.8) * 0.45;
    }
    if (this.chestStarBrooch) {
      this.chestStarBrooch.rotation.z = Math.sin(this.elapsedTime * 2.2) * 0.14;
    }
    if (this.clockworkCharm) {
      this.clockworkCharm.rotation.y = Math.sin(this.elapsedTime * 1.8) * 0.22;
    }
    if (this.clockworkCharmOuter) {
      this.clockworkCharmOuter.rotation.z += dt * 2.5;
    }
    if (this.clockworkCharmInner) {
      this.clockworkCharmInner.rotation.z -= dt * 3.8;
    }

    this.audio?.updateMovementHum?.(speedMag / 18.0, this.rigState.mountId);

    // Step Celestial Atmosphere (Aurora Ribbons, 220 Fireflies, Cloud-Sea Mist, Lanterns & Ferns)
    this._stepCelestialAtmosphere(dt);

    // Step Starlight Slipstream Boost VFX & Horizon Wonder Relics
    if (this.slipstreamVfx) {
      this.slipstreamVfx.step(dt, this.elapsedTime, {
        x: this.rigState.x,
        y: this.rigState.y,
        z: this.rigState.z,
        heading: this.rigState.heading,
        speed: this.rigState.speed,
        boosting: this.rigState.boosting,
        inSurge: this.rigState.inSurge,
        wingSpan: this.rigState.mountId === "starlight_glider" ? 1.45 : 0.95,
      });
    }
    if (this.horizonWonder) {
      this.horizonWonder.step(dt, this.elapsedTime, this.rigState, (ev) => {
        this.audio?.playCoinGrab?.();
        this.onOppositionEvent?.(ev);
      });
    }

    // 2. Step Siphon Projectiles (with buoyant -x Helium Puff upward lift!)
    for (const proj of this.siphonProjectiles) {
      if (!proj.active) continue;
      proj.elapsed += dt;
      const u = Math.min(1, proj.elapsed / proj.duration);
      const x = proj.startPos.x + (proj.targetPos.x - proj.startPos.x) * u;
      const z = proj.startPos.z + (proj.targetPos.z - proj.startPos.z) * u;
      const baseLinearY = proj.startPos.y + (proj.targetPos.y - proj.startPos.y) * u;
      const arcOffset =
        4 * proj.arcHeight * u * (1 - u) +
        proj.buoyantLift * Math.sin(Math.PI * Math.pow(u, 0.7));
      proj.mesh.position.set(x, baseLinearY + arcOffset, z);
      if (u >= 1) {
        proj.active = false;
        proj.mesh.visible = false;
      }
    }

    // 3. Step Harvestable Botanical Thickets
    let thicketChanged = false;
    const harvestRadius = this.rigState.mountId === "bramble_boar" ? 3.2 : 2.35;
    for (const th of this.thickets) {
      if (!th.active) {
        th.regrowSec -= dt;
        if (th.regrowSec <= 0) {
          th.active = true;
          thicketChanged = true;
        }
        continue;
      }
      if (Math.hypot(this.rigState.x - th.x, this.rigState.z - th.z) <= harvestRadius) {
        th.active = false;
        th.regrowSec = 14.0;
        thicketChanged = true;
        if (th.polarity === "+") {
          this.rigState.siphonOrbs.pos += 1;
          this.rigState.siphonOrbs.sun_orb += 1;
        } else {
          this.rigState.siphonOrbs.neg += 1;
          this.rigState.siphonOrbs.frost_spore += 1;
        }
        this.audio?.playSiphonPop?.(1.05);
        this.onWorldActivity(2, 0, "thicketsHarvested");
      }
    }
    if (thicketChanged) {
      this._syncThicketInstances();
    }

    // 4. Central Moonwell Dwell Mystery ("moon_center") & Workshop Pad Hysteresis
    const moonDist = Math.hypot(this.rigState.x, this.rigState.z);
    if (moonDist > 6.5) {
      this._moonMysterySent = false;
    }
    if (!this.encounterDockOpen && moonDist < 4.6 && Math.abs(this.rigState.speed) < 2.5) {
      this.moonDwellSec += dt;
      if (this.moonDwellSec > 1.4 && !this._moonMysterySent) {
        this._moonMysterySent = true;
        this.onMysteryFound("moon_center");
      }
    } else {
      this.moonDwellSec = 0;
    }

    const padDist = Math.hypot(
      this.rigState.x - WORKSHOP_PAD_COORD.x,
      this.rigState.z - WORKSHOP_PAD_COORD.z
    );
    if (!this._inWorkshopPad && padDist < 3.4) {
      this._inWorkshopPad = true;
      this.audio?.playWorkshopChime?.();
      this.onGaragePadEntered();
    } else if (this._inWorkshopPad && padDist > 5.2) {
      this._inWorkshopPad = false;
    }

    // 5. Shrine Gate Proximity Hysteresis
    this._updateShrineProximity();

    // 6. Step Active Blight/Gloom Opposition, Sim Timescale, Outer Biomes & Expeditions!
    const pausedForMath = this.isOppositionPaused();
    this.simTimeState = computeSimulationTimeScale({
      dt,
      encounterDockOpen: this.encounterDockOpen,
      activeGateSlot: Boolean(this.activeGateSlot || this._gateAutoPause),
      bulletTimeRequested: Boolean(this.bulletTimeRequested),
      realmId: "oddroot",
    });
    this.blightSystem.step(dt, {
      paused: pausedForMath,
      menagerie: this.menagerie,
      onWorldActivity: this.onWorldActivity,
    });

    // 7. Step Shrines, Menagerie, Outer Archipelago Biomes, Field Expeditions & Live 2-Player Co-Op
    this.shrines.update(dt, this.elapsedTime);
    this.menagerie.step(dt, this.elapsedTime, {
      audio: this.audio,
      onWorldActivity: this.onWorldActivity,
      onOppositionEvent: this.onOppositionEvent,
    });
    this._stepOuterArchipelagoBiomes(dt, pausedForMath);
    this._stepFieldExpedition(dt);
    this.coop.step(dt, this.elapsedTime, this.rigState);

    // 8. Guardian Awakening, Overdrive Sky-Whale & Self-Ghost Replay/Record
    if (this.guardianAnim) {
      this.guardianAnim.t += dt;
      const gp = Math.min(1, this.guardianAnim.t / this.guardianAnim.dur);
      this.guardianGroup.rotation.y += dt * 3.2;
      this.guardianGroup.position.y = 11.5 + Math.sin(gp * Math.PI) * 3.5;
      if (gp >= 1) {
        this.guardianAnim = null;
      }
    }

    if (this.whaleTimer > 0) {
      this.whaleTimer = Math.max(0, this.whaleTimer - dt);
      const wp = 1 - this.whaleTimer / 11.0;
      this.skyWhale.position.set(
        -42 + wp * 84,
        19.5 + Math.sin(wp * Math.PI) * 7.5,
        -28 + Math.cos(wp * Math.PI * 2) * 8.0
      );
      this.skyWhale.rotation.y = Math.PI / 2;
      if (this.whaleTimer <= 0) {
        this.skyWhale.visible = false;
      }
    }

    this._stepSelfGhost(dt);

    // 9. Smooth Third-Person Sanctuary Camera Follow, FOV Kick + Active Shrine Framing
    const baseFov = this.baseFov || 55;
    const targetFov = slipActive && !this.activeGateSlot ? 60.5 : baseFov;
    const nextFov =
      this.camera.fov + (targetFov - this.camera.fov) * (1 - Math.exp(-7.5 * dt));
    if (Math.abs(nextFov - this.camera.fov) > 0.02) {
      this.camera.fov = nextFov;
      this.camera.updateProjectionMatrix();
    }

    const fwdX = -Math.sin(this.rigState.heading);
    const fwdZ = -Math.cos(this.rigState.heading);
    if (this.activeGateSlot) {
      const s = this.activeGateSlot;
      const shrineOutX = Math.sin(s.rotY);
      const shrineOutZ = Math.cos(s.rotY);
      const midX = (this.rigState.x + s.x) * 0.5;
      const midZ = (this.rigState.z + s.z) * 0.5;
      this._tmpVecA.set(
        midX + shrineOutX * 13.5,
        Math.max(this.rigState.y, s.y) + 7.4,
        midZ + shrineOutZ * 13.5
      );
      this._tmpVecB.set(
        s.x * 0.75 + this.rigState.x * 0.25,
        s.y + 1.9,
        s.z * 0.75 + this.rigState.z * 0.25
      );
    } else {
      this._tmpVecA.set(
        this.rigState.x - fwdX * 13.5,
        this.rigState.y + 8.6,
        this.rigState.z - fwdZ * 13.5
      );
      this._tmpVecB.set(
        this.rigState.x + fwdX * 6.5,
        this.rigState.y + 2.1,
        this.rigState.z + fwdZ * 6.5
      );
    }
    const camLerp = 1 - Math.exp(-6.5 * dt);
    this.camera.position.lerp(this._tmpVecA, camLerp);
    this.camera.lookAt(this._tmpVecB);
    this.camera.updateMatrixWorld();
  }

  _stepAvatarMovement(dt) {
    if (!Number.isFinite(this.rigState.heading)) {
      this.rigState.heading = 0;
    } else if (Math.abs(this.rigState.heading) > Math.PI * 4) {
      this.rigState.heading = Math.atan2(
        Math.sin(this.rigState.heading),
        Math.cos(this.rigState.heading)
      );
    }
    if (!Number.isFinite(this.rigState.x)) this.rigState.x = 0;
    if (!Number.isFinite(this.rigState.z)) this.rigState.z = 22;
    if (!Number.isFinite(this.rigState.y)) {
      this.rigState.y = this._groundHeightAt(this.rigState.x, this.rigState.z) + 0.55;
    }
    if (!Number.isFinite(this.rigState.speed)) this.rigState.speed = 0;

    const mountSpec =
      ODDROOT_MOUNT_SPECS.find((m) => m.id === this.rigState.mountId) || ODDROOT_MOUNT_SPECS[1];

    let steer = this.rigState.steerInput;
    let throttle = this.rigState.throttleInput;

    if (this.autopilotTarget) {
      const wps =
        Array.isArray(this.autopilotTarget.waypoints) &&
        this.autopilotTarget.waypoints.length > 0
          ? this.autopilotTarget.waypoints
          : null;

      let targetX = Number(this.autopilotTarget.x) || 0;
      let targetZ = Number(this.autopilotTarget.z) || 0;
      let isFinalWaypoint = true;

      if (wps) {
        let wpIdx = Math.max(0, Math.min(wps.length - 1, Number(this.autopilotTarget.wpIndex) || 0));
        while (
          wpIdx < wps.length - 1 &&
          Math.hypot(wps[wpIdx].x - this.rigState.x, wps[wpIdx].z - this.rigState.z) < 2.4
        ) {
          wpIdx++;
        }
        this.autopilotTarget.wpIndex = wpIdx;
        targetX = wps[wpIdx].x;
        targetZ = wps[wpIdx].z;
        isFinalWaypoint = wpIdx >= wps.length - 1;
      }

      const dx = targetX - this.rigState.x;
      const dz = targetZ - this.rigState.z;
      const dist = Math.hypot(dx, dz);
      if (isFinalWaypoint && dist < 2.2) {
        this.autopilotTarget = null;
        throttle = 0;
      } else {
        const desiredHeading = Math.atan2(-dx, -dz);
        const rawDiff = desiredHeading - this.rigState.heading;
        const diff = Number.isFinite(rawDiff)
          ? Math.atan2(Math.sin(rawDiff), Math.cos(rawDiff))
          : 0;
        steer = Math.max(-1, Math.min(1, -diff * 3.0));
        throttle =
          Math.abs(diff) > 0.95
            ? 0.22
            : (!isFinalWaypoint || dist > 5.5 ? 1.0 : 0.62) * Math.max(0.45, Math.cos(diff));
      }
    }

    this._lastActiveSteer = steer;

    const groundSample = this._sampleArchipelago(this.rigState.x, this.rigState.z);
    const pyAboveGround = Math.max(0, this.rigState.y - (groundSample.groundY + 0.55));

    const bramble = this.blightSystem.evaluateBrambleContact(
      this.rigState.x,
      this.rigState.z,
      pyAboveGround,
      this.rigState.speed,
      this.rigState.upgradesSet,
      {
        menagerie: this.menagerie,
        audio: this.audio,
        onWorldActivity: this.onWorldActivity,
        onOppositionEvent: this.onOppositionEvent,
      }
    );
    this.rigState.inBlight = bramble.inBramble;

    const hasGlideWings =
      this.rigState.upgradesSet.has("or_glide_wings") ||
      this.rigState.upgradesSet.has("ion_boosters");
    const boostMult = this.rigState.boosting ? (hasGlideWings ? 1.32 : 1.16) : 1.0;
    const autoBoost = this.autopilotTarget ? 1.38 : 1.0;
    const slipstreamMult = this.autopilotTarget
      ? 1.0
      : this.slipstreamVfx
      ? this.slipstreamVfx.getSpeedMultiplier()
      : 1.0;
    const maxSpeed =
      mountSpec.topSpeed *
      boostMult *
      autoBoost *
      slipstreamMult *
      bramble.dragMultiplier *
      bramble.speedBoostMultiplier;

    if (Math.abs(throttle) > 0.02) {
      const targetSpeed = throttle * maxSpeed;
      const accelRate = bramble.dragMultiplier < 1.0 ? 24.0 : 12.0;
      this.rigState.speed +=
        (targetSpeed - this.rigState.speed) * (1 - Math.exp(-accelRate * dt));
    } else {
      const coastDrag = !this.autopilotTarget && this.slipstreamVfx?.isActive() ? 3.8 : 6.5;
      this.rigState.speed *= Math.exp(-coastDrag * dt);
      if (Math.abs(this.rigState.speed) < 0.05) this.rigState.speed = 0;
    }

    this.rigState.heading -= steer * mountSpec.turnRate * dt;

    const fwdX = -Math.sin(this.rigState.heading);
    const fwdZ = -Math.cos(this.rigState.heading);
    this.rigState.x += fwdX * this.rigState.speed * dt;
    this.rigState.z += fwdZ * this.rigState.speed * dt;

    const nextSample = this._sampleArchipelago(this.rigState.x, this.rigState.z);
    const manualSlipstream = Boolean(!this.autopilotTarget && this.slipstreamVfx?.isActive());

    if (bramble.chasmLift > 0) {
      this._chasmGlideTimer = 0.65;
    } else if (!nextSample.onGround && Math.abs(this.rigState.speed) <= 1.0) {
      this._chasmGlideTimer = 0;
    }

    if (this._chasmGlideTimer > 0) {
      this._chasmGlideTimer = Math.max(0, this._chasmGlideTimer - dt);
      this.rigState.glidingAirborne = true;
      const soarArc = Math.sin((this._chasmGlideTimer / 0.65) * (Math.PI * 0.5));
      const liftHeight = bramble.chasmLift > 0 ? 3.2 : 3.2 * soarArc;
      const targetAirY = Math.max(nextSample.groundY, groundSample.groundY) + 0.55 + liftHeight;
      this.rigState.y += (targetAirY - this.rigState.y) * (1 - Math.exp(-16 * dt));
      this._offEdgeSec = 0;
      return;
    }

    if (this._skyrootLiftTimer > 0) {
      this._skyrootLiftTimer = Math.max(0, this._skyrootLiftTimer - dt);
      this.rigState.glidingAirborne = true;
      const liftPhase = 1 - this._skyrootLiftTimer / 0.88;
      const liftArc = Math.sin(liftPhase * Math.PI) * 2.25;
      const targetLiftY = Math.max(nextSample.groundY, groundSample.groundY) + 0.55 + liftArc;
      this.rigState.y += (targetLiftY - this.rigState.y) * (1 - Math.exp(-16 * dt));
      this._offEdgeSec = 0;
      return;
    }

    if (nextSample.onGround) {
      this._offEdgeSec = 0;
      this.rigState.glidingAirborne = false;
      const buoyantLift =
        manualSlipstream && Math.abs(this.rigState.speed) > 1.5
          ? 0.16 * this.slipstreamVfx.getRemainingRatio()
          : 0;
      const targetGroundY = nextSample.groundY + 0.55 + buoyantLift;
      this.rigState.y += (targetGroundY - this.rigState.y) * (1 - Math.exp(-14 * dt));
    } else {
      this._offEdgeSec += dt;
      const maxGlideWindow = manualSlipstream ? 1.65 : 1.15;
      const canGlide =
        (hasGlideWings || this.rigState.mountId === "starlight_glider") &&
        Math.abs(this.rigState.speed) > 2.2 &&
        this._offEdgeSec < maxGlideWindow &&
        Math.hypot(this.rigState.x, this.rigState.z) < 72;

      if (canGlide) {
        this.rigState.glidingAirborne = true;
        this.rigState.y -= (manualSlipstream ? 0.14 : 0.42) * dt;
      } else {
        // Archipelago Updraft Cushion: gentle golden-cyan geyser arc back onto solid moss!
        this.rigState.glidingAirborne = false;
        this._offEdgeSec = 0;
        this.audio?.playUpdraftLift?.();
        this.rigAnim = {
          kind: "updraft_lift",
          t: 0,
          dur: 0.55,
          startX: this.rigState.x,
          startY: this.rigState.y,
          startZ: this.rigState.z,
          lastX: this.rigState.x,
          lastZ: this.rigState.z,
          endX: nextSample.safeX,
          endY: nextSample.safeY + 0.55,
          endZ: nextSample.safeZ,
        };
      }
    }
  }

  _updateShrineProximity() {
    if (this.rigAnim) return;

    if (this.activeGateSlot) {
      if (this.activeGateSlot.cleared) {
        this.activeGateSlot = null;
        this._gateAutoPause = false;
        return;
      }
      const s = this.activeGateSlot;
      const ax = s.x + Math.sin(s.rotY) * 6.0;
      const az = s.z + Math.cos(s.rotY) * 6.0;
      const dist = Math.hypot(this.rigState.x - ax, this.rigState.z - az);
      if (dist > 12.0) {
        this.activeGateSlot = null;
        this._gateAutoPause = false;
        this.onLeaveGate();
      }
      return;
    }

    for (const slot of this.gateSlots) {
      if (slot.cleared) continue;
      const ax = slot.x + Math.sin(slot.rotY) * 6.0;
      const az = slot.z + Math.cos(slot.rotY) * 6.0;
      const dist = Math.hypot(this.rigState.x - ax, this.rigState.z - az);
      if (dist < 9.2) {
        this.activeGateSlot = slot;
        this._gateAutoPause = true;
        this.autopilotTarget = null;
        this.onApproachGate(slot.encounter, slot);
        break;
      }
    }
  }

  _stepSelfGhost(dt) {
    if (this.gateSlots.length > 0 && !this.areAllEncountersCleared()) {
      if (this.isOppositionPaused()) return;
      this.waveElapsedSec += dt;
      this._ghostRecordAccum += dt;
      if (this._ghostRecordAccum >= 0.2 && this.currentRunFrames.length < 600) {
        this._ghostRecordAccum = 0;
        this.currentRunFrames.push({
          t: Number(this.waveElapsedSec.toFixed(2)),
          x: Number(this.rigState.x.toFixed(2)),
          y: Number(this.rigState.y.toFixed(2)),
          z: Number(this.rigState.z.toFixed(2)),
          heading: Number(this.rigState.heading.toFixed(2)),
        });
      }

      if (this.ghostBest && Array.isArray(this.ghostBest.frames) && this.ghostBest.frames.length >= 2) {
        const frames = this.ghostBest.frames;
        const t = this.waveElapsedSec;
        if (t <= this.ghostBest.durationSec) {
          this.ghostGroup.visible = true;
          let idx = 0;
          while (idx < frames.length - 2 && frames[idx + 1].t < t) {
            idx++;
          }
          const f0 = frames[idx];
          const f1 = frames[idx + 1];
          const span = Math.max(0.01, f1.t - f0.t);
          const u = Math.max(0, Math.min(1, (t - f0.t) / span));
          this.ghostGroup.position.set(
            f0.x + (f1.x - f0.x) * u,
            f0.y + (f1.y - f0.y) * u,
            f0.z + (f1.z - f0.z) * u
          );
          this.ghostGroup.rotation.y = f0.heading;
        } else {
          this.ghostGroup.visible = false;
        }
      } else {
        this.ghostGroup.visible = false;
      }
    } else {
      this.ghostGroup.visible = false;
    }
  }
}
