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

export { getSanctuaryJournalEntries, SHARED_COIN_IDS };

export const MAX_SPORE_LILIES = 96;

export const SANCTUARY_ISLANDS = [
  { id: "center", name: "World-Tree & Moonwell Sanctuary", x: 0, z: 0, radius: 16.5, topY: 0.0 },
  { id: "south", name: "Sunbeam Entry & Workshop Terrace", x: 0, z: 24, radius: 12.5, topY: 0.4 },
  { id: "west", name: "West Cauldron Grove", x: -24, z: -12, radius: 12.0, topY: 1.2 },
  { id: "east", name: "East Conservatory Looms", x: 24, z: -12, radius: 12.0, topY: 1.2 },
  { id: "north", name: "North Starlight Cliff", x: 0, z: -30, radius: 13.0, topY: 2.0 },
  { id: "obs", name: "Northern Observatory Ridge", x: 0, z: -60, radius: 11.5, topY: 3.6 },
];

export const SANCTUARY_BRIDGES = [
  { ax: 0, az: 14.5, ay: 0.35, bx: 0, bz: 13.0, by: 0.05, width: 5.8 },
  { ax: -12.5, az: -5.0, ay: 0.1, bx: -16.0, bz: -7.8, by: 1.1, width: 4.8 },
  { ax: 12.5, az: -5.0, ay: 0.1, bx: 16.0, bz: -7.8, by: 1.1, width: 4.8 },
  { ax: 0, az: -14.8, ay: 0.1, bx: 0, bz: -18.5, by: 1.9, width: 5.2 },
  { ax: -16.5, az: -18.0, ay: 1.2, bx: -9.8, bz: -24.0, by: 1.95, width: 4.2 },
  { ax: 16.5, az: -18.0, ay: 1.2, bx: 9.8, bz: -24.0, by: 1.95, width: 4.2 },
  { ax: 0, az: -41.5, ay: 2.0, bx: 0, bz: -49.5, by: 3.55, width: 4.6 },
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
};

const AUTOPILOT_ISLAND_ADJ = {
  south: ["center"],
  center: ["south", "west", "east", "north"],
  west: ["center", "north"],
  east: ["center", "north"],
  north: ["center", "west", "east", "obs"],
  obs: ["north"],
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
    this.scene.fog = new THREE.FogExp2(0x0d2633, 0.0062);

    this.camera = new THREE.PerspectiveCamera(52, 16 / 9, 0.4, 340);
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

    const hemi = new THREE.HemisphereLight(0xa8f5e8, 0x162b38, 1.2);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffe8b0, 1.55);
    sun.position.set(34, 58, 28);
    this.scene.add(sun);

    const rimFill = new THREE.DirectionalLight(0x38f2c8, 0.62);
    rimFill.position.set(-38, 32, -48);
    this.scene.add(rimFill);

    this._buildSanctuaryArchipelago();
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

    this.rebuildAvatar(this.rigState.mountId, this.rigState.upgrades);
    this.setObservatoryTier(1);
    this.resize();

    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      this._onResize = () => this.resize();
      window.addEventListener("resize", this._onResize);
    }
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
    const cliffUndersideMat = createOddrootToonRimMaterial(this.toonGradientTex, {
      color: 0x2c3646,
      emissive: 0x101824,
      emissiveIntensity: 0.2,
      rimColor: 0x38bdf8,
      rimIntensity: 0.28,
    });
    const bridgePlankMat = createOddrootToonRimMaterial(this.toonGradientTex, {
      color: 0x855a34,
      emissive: 0x2c1a0a,
      emissiveIntensity: 0.28,
      rimColor: 0xffd166,
      rimIntensity: 0.42,
    });
    const waterfallMat = new THREE.MeshBasicMaterial({
      color: 0x62f5e4,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    });

    for (const isl of SANCTUARY_ISLANDS) {
      const islGrp = new THREE.Group();
      islGrp.name = `Island_${isl.id}`;
      islGrp.position.set(isl.x, isl.topY, isl.z);

      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(isl.radius, isl.radius * 0.94, 1.2, 28),
        mossTopMat
      );
      cap.position.y = -0.6;
      islGrp.add(cap);

      const rootCone = new THREE.Mesh(
        new THREE.ConeGeometry(isl.radius * 0.88, isl.radius * 0.72, 16),
        cliffUndersideMat
      );
      rootCone.rotation.x = Math.PI;
      rootCone.position.y = -1.2 - isl.radius * 0.36;
      islGrp.add(rootCone);

      this.archipelagoGroup.add(islGrp);
    }

    for (const br of SANCTUARY_BRIDGES) {
      const dx = br.bx - br.ax;
      const dy = br.by - br.ay;
      const dz = br.bz - br.az;
      const len = Math.hypot(dx, dy, dz) || 1;
      const deck = new THREE.Mesh(
        new THREE.BoxGeometry(br.width, 0.24, len + 1.4),
        bridgePlankMat
      );
      deck.position.set((br.ax + br.bx) * 0.5, (br.ay + br.by) * 0.5 - 0.1, (br.az + br.bz) * 0.5);
      deck.rotation.y = Math.atan2(dx, dz);
      deck.rotation.x = -Math.asin(Math.max(-0.8, Math.min(0.8, dy / len)));
      this.archipelagoGroup.add(deck);
    }

    // Glowing cascading waterfalls on West, East & North cliffs
    this.waterfalls = [];
    for (const [wx, wy, wz] of [
      [-31, 1.2, -8],
      [31, 1.2, -8],
      [-7.5, 3.6, -54],
    ]) {
      const wf = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.9, 14, 10, 1, true), waterfallMat);
      wf.position.set(wx, wy - 7.0, wz);
      this.archipelagoGroup.add(wf);
      this.waterfalls.push(wf);
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

    const pondWater = new THREE.Mesh(
      new THREE.CircleGeometry(4.35, 36),
      new THREE.MeshBasicMaterial({
        color: 0x4de8dd,
        transparent: true,
        opacity: 0.42,
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
        emissiveIntensity: 0.85,
      })
    );
    this.centralMoonLantern.position.set(0, 2.35, 0);
    this.moonwellGroup.add(this.centralMoonLantern);
    this.scene.add(this.moonwellGroup);

    // 2. Ancient World-Tree Buttress Roots & Canopy Arching Behind Moonwell (0, 0, -4.5)
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
      emissiveIntensity: 0.42,
      rimColor: 0xffd166,
      rimIntensity: 0.52,
    });

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.6, 11.5, 12), barkMat);
    trunk.position.y = 5.75;
    this.worldTreeGroup.add(trunk);

    for (let r = 0; r < 4; r++) {
      const ang = (r / 4) * Math.PI * 2 + Math.PI / 4;
      const rootArch = new THREE.Mesh(
        new THREE.TorusGeometry(4.2, 0.45, 8, 20, Math.PI * 0.6),
        barkMat
      );
      rootArch.position.set(Math.cos(ang) * 2.8, 0.4, Math.sin(ang) * 2.8);
      rootArch.rotation.y = -ang;
      this.worldTreeGroup.add(rootArch);
    }

    const mainCanopy = new THREE.Mesh(new THREE.DodecahedronGeometry(6.8, 1), this.canopyMat);
    mainCanopy.position.set(0, 13.8, 0);
    mainCanopy.scale.set(1.25, 0.72, 1.25);
    this.worldTreeGroup.add(mainCanopy);
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
    };

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
      color: normMount === "bramble_boar" ? 0xd98a2b : 0x45d9c6,
      emissive: normMount === "bramble_boar" ? 0x5c3409 : 0x115e59,
      emissiveIntensity: 0.35,
    });
    const trimHex = cx.goldenMosaicTrimUnlocked
      ? 0xffd166
      : cx.auroraBladeTrimUnlocked
      ? 0x38f2ff
      : 0x7ee081;
    const trimMat = createOddrootToonRimMaterial(this.toonGradientTex, {
      color: trimHex,
      emissive: trimHex,
      emissiveIntensity: 0.62,
    });

    this.boarLegs = [];
    this.gliderWings = [];

    if (normMount === "bramble_boar") {
      const boarBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.68, 1.25, 6, 12), primaryMat);
      boarBody.rotation.x = Math.PI / 2;
      boarBody.position.y = 0.85;
      grp.add(boarBody);

      for (const [lx, lz] of [
        [-0.48, -0.55],
        [0.48, -0.55],
        [-0.48, 0.55],
        [0.48, 0.55],
      ]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.65, 8), primaryMat);
        leg.position.set(lx, 0.34, lz);
        grp.add(leg);
        this.boarLegs.push(leg);
      }

      const tuskSpan = hasTuskPlow ? 1.35 : 0.72;
      for (const sx of [-1, 1]) {
        const tusk = new THREE.Mesh(
          new THREE.ConeGeometry(hasTuskPlow ? 0.24 : 0.16, hasTuskPlow ? 1.15 : 0.8, 8),
          trimMat
        );
        tusk.rotation.x = -Math.PI / 3;
        tusk.position.set(sx * tuskSpan, 0.76, -1.05);
        grp.add(tusk);
      }

      const rider = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.6, 6, 10), trimMat);
      rider.position.set(0, 1.65, 0.08);
      grp.add(rider);
    } else {
      const cloak = new THREE.Mesh(new THREE.ConeGeometry(0.58, 1.42, 12), primaryMat);
      cloak.position.y = 0.95;
      grp.add(cloak);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 10), trimMat);
      head.position.y = 1.85;
      grp.add(head);

      const wingWidth = hasGlideWings ? 1.75 : 1.1;
      for (const sx of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(wingWidth, 0.09, 0.78), trimMat);
        wing.position.set(sx * (0.45 + wingWidth * 0.45), 1.35, 0.22);
        wing.rotation.z = sx * 0.2;
        grp.add(wing);
        this.gliderWings.push({ mesh: wing, side: sx });
      }
    }

    if (hasAntlerCrown || cx.silverMoonLantern) {
      const crown = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.06, 8, 24), trimMat);
      crown.rotation.x = Math.PI / 2;
      crown.position.set(0, 2.38, 0);
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

    // Crescent 3D Siphon-Staff
    this.siphonStaffGroup = new THREE.Group();
    this.siphonStaffGroup.name = "CrescentSiphonStaff";
    this.siphonStaffGroup.position.set(0.62, 1.25, -0.35);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 1.95, 8), trimMat);
    this.siphonStaffGroup.add(shaft);

    const crescentRadius = hasWideSiphon ? 0.42 : 0.26;
    const crescent = new THREE.Mesh(
      new THREE.TorusGeometry(crescentRadius, 0.06, 8, 20, Math.PI * 1.45),
      trimMat
    );
    crescent.position.set(0, 1.05, 0);
    this.siphonStaffGroup.add(crescent);

    this.siphonTipOrb = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 10, 8),
      createOddrootToonRimMaterial(this.toonGradientTex, {
        color: 0xffcf56,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.85,
      })
    );
    this.siphonTipOrb.position.set(0, 1.05, 0);
    this.siphonStaffGroup.add(this.siphonTipOrb);

    if (cx.titanAstrolabeSynced) {
      const pommel = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 8, 18), trimMat);
      pommel.position.set(0, -0.95, 0);
      this.siphonStaffGroup.add(pommel);
    }
    grp.add(this.siphonStaffGroup);

    // Companion Crystal Fox
    if (hasCrystalFox) {
      const fox = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.65, 8), trimMat);
      fox.rotation.x = -Math.PI / 2;
      fox.position.set(-1.35, 0.48, 0.25);
      grp.add(fox);
      this.companionFox = fox;
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

    grp.position.set(this.rigState.x, this.rigState.y, this.rigState.z);
    grp.rotation.y = this.rigState.heading;
    this.scene.add(grp);
    this.avatarGroup = grp;
    this.rigGroup = grp;
    return grp;
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
      this.canopyMat.emissiveIntensity = this.rigState.inSurge ? 0.85 : 0.42;
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
      if (toIsl === "center" && i < islRoute.length - 2) {
        waypoints.push({ x: 0, z: -6.0 });
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
        if (this.rigAnim.kind === "grind_vine" && this.rigAnim.slot) {
          const s = this.rigAnim.slot;
          const sample = this._sampleArchipelago(s.x, s.z + 5.5);
          this.rigState.x = sample.safeX;
          this.rigState.z = sample.safeZ;
          this.rigState.y = sample.safeY + 0.55;
        }
        this.rigAnim = null;
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

    this.avatarGroup.position.set(this.rigState.x, this.rigState.y, this.rigState.z);
    this.avatarGroup.rotation.y = this.rigState.heading;
    this._stepSporeLilyWake(dt);

    // Animate mount legs / wings
    const speedMag = Math.abs(this.rigState.speed);
    for (let i = 0; i < this.boarLegs.length; i++) {
      this.boarLegs[i].rotation.x =
        Math.sin(this.elapsedTime * 12 * Math.min(1.5, speedMag / 10) + i * Math.PI * 0.5) *
        0.45 *
        Math.min(1, speedMag / 4);
    }
    for (const w of this.gliderWings) {
      w.mesh.rotation.z =
        w.side * (0.2 + Math.sin(this.elapsedTime * 5.0) * (this.rigState.glidingAirborne ? 0.28 : 0.08));
    }

    this.audio?.updateMovementHum?.(speedMag / 18.0, this.rigState.mountId);

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
    if (moonDist < 4.6 && Math.abs(this.rigState.speed) < 2.5) {
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

    // 6. Step Active Blight/Gloom Opposition (100% frozen when isOppositionPaused() === true!)
    this.blightSystem.step(dt, {
      paused: this.isOppositionPaused(),
      menagerie: this.menagerie,
      onWorldActivity: this.onWorldActivity,
    });

    // 7. Step Shrines, Menagerie & Live 2-Player Co-Op
    this.shrines.update(dt, this.elapsedTime);
    this.menagerie.step(dt, this.elapsedTime, {
      audio: this.audio,
      onWorldActivity: this.onWorldActivity,
      onOppositionEvent: this.onOppositionEvent,
    });
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

    // 9. Smooth Third-Person Sanctuary Camera Follow + Active Shrine Framing
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
    const maxSpeed =
      mountSpec.topSpeed *
      boostMult *
      autoBoost *
      bramble.dragMultiplier *
      bramble.speedBoostMultiplier;

    if (Math.abs(throttle) > 0.02) {
      const targetSpeed = throttle * maxSpeed;
      const accelRate = bramble.dragMultiplier < 1.0 ? 24.0 : 12.0;
      this.rigState.speed +=
        (targetSpeed - this.rigState.speed) * (1 - Math.exp(-accelRate * dt));
    } else {
      this.rigState.speed *= Math.exp(-6.5 * dt);
      if (Math.abs(this.rigState.speed) < 0.05) this.rigState.speed = 0;
    }

    this.rigState.heading -= steer * mountSpec.turnRate * dt;

    const fwdX = -Math.sin(this.rigState.heading);
    const fwdZ = -Math.cos(this.rigState.heading);
    this.rigState.x += fwdX * this.rigState.speed * dt;
    this.rigState.z += fwdZ * this.rigState.speed * dt;

    const nextSample = this._sampleArchipelago(this.rigState.x, this.rigState.z);

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

    if (nextSample.onGround) {
      this._offEdgeSec = 0;
      this.rigState.glidingAirborne = false;
      const targetGroundY = nextSample.groundY + 0.55;
      this.rigState.y += (targetGroundY - this.rigState.y) * (1 - Math.exp(-14 * dt));
    } else {
      this._offEdgeSec += dt;
      const canGlide =
        (hasGlideWings || this.rigState.mountId === "starlight_glider") &&
        Math.abs(this.rigState.speed) > 2.2 &&
        this._offEdgeSec < 1.15 &&
        Math.hypot(this.rigState.x, this.rigState.z) < 66;

      if (canGlide) {
        this.rigState.glidingAirborne = true;
        this.rigState.y -= 0.42 * dt;
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
