/**
 * Oddroot Wilds — Sanctuary Menagerie, Creature Morphogenesis & Zero-G Astro-Toads
 * Persistent 3D spirit creatures evolving across Sprout -> Luminous -> Astral tiers,
 * upside-down Zero-G Astro-Toads floating upward to bonk suspended Sky-Chests,
 * non-punitive sleepy spore-bubbles, and pure Sanctuary Evolution Journal helper.
 */

import * as THREE from "../vendor/three.module.min.js";
import { buildSanctuaryCreature3D } from "../core/character-graphics-3d.js";

export const CREATURE_SPECS = [
  {
    id: "luminous_oddling",
    aliases: ["sun_oddling", "frost_oddling", "sprout_oddling"],
    name: "Luminous Oddling",
    icon: "🌱",
    habitat: "Moonwell Moss Terraces",
    accentHex: "#7ee081",
    colorHex: 0x7ee081,
    emissiveHex: 0x2dd4bf,
    discoveryClue: "Brew your first sanctuary cauldron to coax this moss-sprite out to dance.",
    whispersByStage: {
      1: "Hops between warm sun-berries with a tiny glowing leaf-cap.",
      2: "Spins twin turquoise lantern-petals that hum near moonwater.",
      3: "Wears a floating astral ring that scatters golden dew across bridges.",
    },
  },
  {
    id: "zero_g_toad",
    aliases: ["astro_toad"],
    name: "Zero-G Astro-Toad",
    icon: "🐸",
    habitat: "Sub-Zero Canopy Sky-Chests",
    accentHex: "#4ad8ff",
    colorHex: 0x4ad8ff,
    emissiveHex: 0x38bdf8,
    discoveryClue: "Brew an icy sub-zero elixir below zero to flip gravity on its head!",
    whispersByStage: {
      1: "Flips belly-up in sub-zero mist and floats upward to bonk Sky-Chests!",
      2: "Grows crystalline nebula fins and rebounds off high canopy treasure.",
      3: "Orbits the World-Tree crown in an astral halo, showering bonus Flux.",
    },
  },
  {
    id: "crystal_fox",
    aliases: [],
    name: "Sanctuary Crystal Fox",
    icon: "🦊",
    habitat: "Sunbeam Lantern Bridges",
    accentHex: "#ffd166",
    colorHex: 0xffd166,
    emissiveHex: 0xf59e0b,
    discoveryClue: "Welcome a Spirit Guide at a tricky shrine or unlock the Crystal Fox charm.",
    whispersByStage: {
      1: "Trots beside explorers with warm amber tail-sparks and friendly nudges.",
      2: "Unfurls twin prism tails that paint golden footpaths over mossy arches.",
      3: "Crowned in starlight runes, illuminating hidden sanctuary shortcuts.",
    },
  },
  {
    id: "eclipse_stag",
    aliases: [],
    name: "Twilight Eclipse Stag",
    icon: "🦌",
    habitat: "Starlight Conservatory Grove",
    accentHex: "#62f5e4",
    colorHex: 0x62f5e4,
    emissiveHex: 0x14b8a6,
    discoveryClue: "Weave crystal looms or align a Moonwell Star-Ring to summon this guardian.",
    whispersByStage: {
      1: "Steps silently across Moonwell ripples with silver-moss velvet antlers.",
      2: "Carries brass crescent sun-mirrors cradled between luminous tines.",
      3: "Bears a miniature spinning constellation crown above the grove.",
    },
  },
  {
    id: "starlight_whale",
    aliases: ["aurora_whale", "starlight_sky_whale"],
    name: "Starlight Sky-Whale",
    icon: "🐋",
    habitat: "Twilight Sanctuary Horizon",
    accentHex: "#c084fc",
    colorHex: 0xc084fc,
    emissiveHex: 0x8b5cf6,
    discoveryClue: "Chain three Overdrive sparks in a row to call its song across the sky!",
    whispersByStage: {
      1: "Glides above floating waterfalls trailing ribbons of twilight mist.",
      2: "Flukes shimmer with emerald starlight that ripples every sanctuary lantern.",
      3: "Sings a deep celestial chord while wearing a golden astral crown.",
    },
  },
];

const SKY_CHEST_COORDS = [
  { id: "sky_chest_0", x: 7.2, y: 7.4, z: -5.2 },
  { id: "sky_chest_1", x: -7.2, y: 7.6, z: -5.2 },
  { id: "sky_chest_2", x: 0.0, y: 8.0, z: -10.0 },
];

const NEST_COORDS = [
  { laneIdx: 0, speciesId: "luminous_oddling", x: -9.5, z: -7.5 },
  { laneIdx: 1, speciesId: "zero_g_toad", x: 9.5, z: -7.5 },
  { laneIdx: 2, speciesId: "crystal_fox", x: -8.5, z: 8.5 },
  { laneIdx: 3, speciesId: "eclipse_stag", x: 8.5, z: 8.5 },
];

function safeFiniteNum(val, fallback = 0) {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function toSafeStageInt(val) {
  const n = Number(val);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(3, Math.floor(n));
}

function hasWorldWin(progress, worldPrefixes) {
  const nodes = progress?.nodes || {};
  for (const [nodeId, state] of Object.entries(nodes)) {
    if (safeFiniteNum(state?.wins, 0) > 0 || safeFiniteNum(state?.stage, 0) >= 2) {
      for (const prefix of worldPrefixes) {
        if (nodeId.startsWith(prefix)) return true;
      }
    }
  }
  return false;
}

export function computeCreatureStage(speciesId, progress = {}) {
  const spec = CREATURE_SPECS.find(
    (s) => s.id === speciesId || s.aliases.includes(speciesId)
  );
  if (!spec) return 0;

  const oddState = progress?.games?.oddroot || {};
  const hatchedList = Array.isArray(oddState.hatchedCreatures) ? oddState.hatchedCreatures : [];
  const hatchedSet = new Set(hatchedList);
  const storedStages =
    oddState.creatureStages && typeof oddState.creatureStages === "object"
      ? oddState.creatureStages
      : {};
  let storedStage = toSafeStageInt(storedStages[spec.id]);
  for (const alias of spec.aliases) {
    storedStage = Math.max(storedStage, toSafeStageInt(storedStages[alias]));
  }

  const upgrades = new Set([
    ...(Array.isArray(progress?.ownedUpgrades) ? progress.ownedUpgrades : []),
    ...(Array.isArray(oddState.sanctuaryUpgrades) ? oddState.sanctuaryUpgrades : []),
  ]);
  const mysteries = new Set(
    Array.isArray(progress?.discoveredMysteries) ? progress.discoveredMysteries : []
  );
  const unlockedWorldsCount = Array.isArray(progress?.unlockedWorlds)
    ? progress.unlockedWorlds.length
    : 1;
  const totalSolved = safeFiniteNum(progress?.totalSolved, 0);

  let isHatched = hatchedSet.has(spec.id) || spec.aliases.some((a) => hatchedSet.has(a));

  if (!isHatched) {
    if (spec.id === "luminous_oddling") {
      isHatched = totalSolved >= 1 || safeFiniteNum(oddState.cauldronsBrewed, 0) >= 1;
    } else if (spec.id === "zero_g_toad") {
      isHatched =
        safeFiniteNum(progress?.records?.deepestSubZero, 0) > 0 ||
        mysteries.has("subzero_abyss") ||
        safeFiniteNum(progress?.nodes?.["W1.1"]?.wins, 0) > 0 ||
        safeFiniteNum(progress?.nodes?.["W1.2"]?.wins, 0) > 0 ||
        safeFiniteNum(progress?.nodes?.["W0.2"]?.wins, 0) > 0;
    } else if (spec.id === "crystal_fox") {
      isHatched =
        upgrades.has("or_crystal_fox") ||
        upgrades.has("spirit_fox") ||
        safeFiniteNum(progress?.records?.foxesWoken, 0) >= 1 ||
        Boolean(oddState.mosaicForged) ||
        unlockedWorldsCount >= 4 ||
        totalSolved >= 12;
    } else if (spec.id === "eclipse_stag") {
      isHatched =
        mysteries.has("astrolabe_lock") ||
        mysteries.has("moon_center") ||
        hasWorldWin(progress, ["W2", "W3", "W5", "W6", "W7"]);
    } else if (spec.id === "starlight_whale") {
      isHatched =
        mysteries.has("aurora_whale") ||
        safeFiniteNum(progress?.records?.bestOverdriveStreak, 0) >= 3;
    }
  }

  if (!isHatched && storedStage <= 0) {
    return 0;
  }

  let derived = 1;
  if (unlockedWorldsCount >= 3 || totalSolved >= 6) {
    derived = 2;
  }
  if (spec.id === "zero_g_toad" && safeFiniteNum(progress?.records?.deepestSubZero, 0) >= 40) {
    derived = Math.max(derived, 2);
  }
  if (spec.id === "eclipse_stag" && mysteries.has("moon_center")) {
    derived = Math.max(derived, 2);
  }
  if (spec.id === "crystal_fox" && (upgrades.has("or_crystal_fox") || upgrades.has("spirit_fox"))) {
    derived = Math.max(derived, 2);
  }

  const astralMilestone =
    unlockedWorldsCount >= 5 ||
    totalSolved >= 16 ||
    (spec.id === "zero_g_toad" &&
      (safeFiniteNum(progress?.records?.deepestSubZero, 0) >= 100 ||
        mysteries.has("subzero_abyss"))) ||
    (spec.id === "eclipse_stag" && mysteries.has("astrolabe_lock")) ||
    (spec.id === "crystal_fox" &&
      (Boolean(oddState.mosaicForged) || safeFiniteNum(progress?.nodes?.["W6.3"]?.wins, 0) > 0)) ||
    (spec.id === "starlight_whale" &&
      (safeFiniteNum(progress?.records?.bestOverdriveStreak, 0) >= 4 ||
        unlockedWorldsCount >= 5)) ||
    (spec.id === "luminous_oddling" && safeFiniteNum(oddState.cauldronsBrewed, 0) >= 8);

  if (astralMilestone) {
    derived = 3;
  }

  return Math.max(1, Math.min(3, Math.floor(Math.max(storedStage, derived))));
}

export function getSanctuaryJournalEntries(progress = {}) {
  const stageNames = ["Unhatched", "Sprout", "Luminous", "Astral"];
  return CREATURE_SPECS.map((spec) => {
    const stage = computeCreatureStage(spec.id, progress);
    const hatched = stage >= 1;
    return {
      id: spec.id,
      aliases: [...spec.aliases],
      name: spec.name,
      icon: spec.icon,
      hatched,
      stage,
      stageLabel: stageNames[stage] || stageNames[0],
      tierBadges: [
        { tier: 1, name: "Sprout", unlocked: stage >= 1 },
        { tier: 2, name: "Luminous", unlocked: stage >= 2 },
        { tier: 3, name: "Astral", unlocked: stage >= 3 },
      ],
      habitat: spec.habitat,
      whisper: hatched ? spec.whispersByStage[stage] || spec.whispersByStage[1] : spec.discoveryClue,
      discoveryClue: spec.discoveryClue,
      accentHex: spec.accentHex,
    };
  });
}

export class SanctuaryMenagerie3D {
  constructor({ scene, toonGradientMap = null, sampleGroundY = null } = {}) {
    this.scene = scene;
    this.toonGradientMap = toonGradientMap;
    this.sampleGroundY = sampleGroundY || (() => 0.0);

    this.rootGroup = new THREE.Group();
    this.rootGroup.name = "SanctuaryMenagerieRoot";
    if (this.scene) {
      this.scene.add(this.rootGroup);
    }

    this.skyChests = [];
    this.nests = [];
    this.creatures = new Map();
    this.chestCounter = 0;

    this._buildSkyChests();
    this._buildNestsAndCreatures();
  }

  _buildSkyChests() {
    const grad = this.toonGradientMap || null;
    const woodMat = new THREE.MeshToonMaterial({
      color: 0x7c5333,
      emissive: 0x2b1a0e,
      emissiveIntensity: 0.25,
      gradientMap: grad,
    });
    const brassMat = new THREE.MeshToonMaterial({
      color: 0xffd166,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.55,
      gradientMap: grad,
    });
    const vineMat = new THREE.MeshToonMaterial({
      color: 0x34d399,
      emissive: 0x10b981,
      emissiveIntensity: 0.35,
      gradientMap: grad,
    });

    for (const sc of SKY_CHEST_COORDS) {
      const group = new THREE.Group();
      group.position.set(sc.x, sc.y, sc.z);

      const base = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.72, 0.88), woodMat);
      group.add(base);

      const trim = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.16, 0.92), brassMat);
      trim.position.y = 0.28;
      group.add(trim);

      const lidPivot = new THREE.Group();
      lidPivot.position.set(0, 0.36, -0.44);
      const lidBox = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.32, 0.88), brassMat);
      lidBox.position.set(0, 0.16, 0.44);
      lidPivot.add(lidBox);
      group.add(lidPivot);

      const tether = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.2, 6), vineMat);
      tether.position.y = 2.4;
      group.add(tether);

      this.rootGroup.add(group);
      this.skyChests.push({
        id: sc.id,
        x: sc.x,
        y: sc.y,
        z: sc.z,
        baseY: sc.y,
        bonkCount: 0,
        bonkBounceTimer: 0,
        cooldown: 0,
        group,
        lidMesh: lidPivot,
      });
    }
  }

  _buildCreatureMesh(spec) {
    const grad = this.toonGradientMap || null;
    const accentMat = new THREE.MeshToonMaterial({
      color: 0xfffae0,
      emissive: spec.colorHex,
      emissiveIntensity: 0.52,
      gradientMap: grad,
    });
    const astralMat = new THREE.MeshToonMaterial({
      color: 0xffd166,
      emissive: 0xfbbf24,
      emissiveIntensity: 0.85,
      gradientMap: grad,
    });

    const mesh = new THREE.Group();
    mesh.name = `Creature_${spec.id}`;

    const sculptedModel = buildSanctuaryCreature3D(spec.id, 1);
    if (spec.id === "starlight_whale") {
      sculptedModel.scale.setScalar(0.85);
    } else if (spec.id === "zero_g_toad") {
      sculptedModel.rotation.y = Math.PI;
    } else {
      sculptedModel.rotation.y = Math.PI / 2;
    }
    mesh.add(sculptedModel);

    const crestBaseY =
      spec.id === "eclipse_stag"
        ? 2.48
        : spec.id === "luminous_oddling"
        ? 1.48
        : spec.id === "crystal_fox"
        ? 1.16
        : spec.id === "starlight_whale"
        ? 1.55
        : 0.88;

    const sproutBud = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), accentMat);
    sproutBud.position.set(0, crestBaseY, 0);
    mesh.add(sproutBud);

    const luminousCrest = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), accentMat);
    luminousCrest.position.set(0, crestBaseY + 0.24, -0.1);
    luminousCrest.visible = false;
    mesh.add(luminousCrest);

    const astralHalo = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.07, 8, 24), astralMat);
    astralHalo.rotation.x = Math.PI / 2;
    astralHalo.position.set(0, crestBaseY + 0.42, 0);
    astralHalo.visible = false;
    mesh.add(astralHalo);

    const bubbleMat = new THREE.MeshBasicMaterial({
      color: 0xb794f4,
      transparent: true,
      opacity: 0.0,
    });
    const sleepBubbleMesh = new THREE.Mesh(new THREE.SphereGeometry(1.25, 14, 12), bubbleMat);
    sleepBubbleMesh.position.set(0, 0.55, 0);
    sleepBubbleMesh.visible = true;
    sleepBubbleMesh.scale.setScalar(0.0001);
    mesh.add(sleepBubbleMesh);

    return { mesh, sculptedModel, sproutBud, luminousCrest, astralHalo, sleepBubbleMesh };
  }

  _buildNestsAndCreatures() {
    const grad = this.toonGradientMap || null;
    const nestMat = new THREE.MeshToonMaterial({
      color: 0x264e44,
      emissive: 0x1d7a64,
      emissiveIntensity: 0.32,
      gradientMap: grad,
    });

    for (const nc of NEST_COORDS) {
      const ny = this.sampleGroundY(nc.x, nc.z);
      const nestRing = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.2, 8, 20), nestMat);
      nestRing.rotation.x = -Math.PI / 2;
      nestRing.position.set(nc.x, ny + 0.1, nc.z);
      this.rootGroup.add(nestRing);

      this.nests.push({
        laneIdx: nc.laneIdx,
        speciesId: nc.speciesId,
        x: nc.x,
        y: ny,
        z: nc.z,
        sleepiness: 0,
        ringMesh: nestRing,
      });
    }

    for (let i = 0; i < CREATURE_SPECS.length; i++) {
      const spec = CREATURE_SPECS[i];
      const built = this._buildCreatureMesh(spec);
      const nest = this.nests.find((n) => n.speciesId === spec.id) || null;
      const homeX = nest ? nest.x : 0;
      const homeZ = nest ? nest.z : -24;
      const homeY = spec.id === "starlight_whale" ? 18.5 : this.sampleGroundY(homeX, homeZ) + 0.55;

      built.mesh.position.set(homeX, homeY, homeZ);
      const starterVisible = spec.id === "luminous_oddling";
      built.mesh.visible = starterVisible;
      this.rootGroup.add(built.mesh);

      const entry = {
        id: spec.id,
        spec,
        hatched: starterVisible,
        stage: starterVisible ? 1 : 0,
        x: homeX,
        y: homeY,
        z: homeZ,
        vy: 0,
        homeX,
        homeY,
        homeZ,
        visitAnchorX: homeX,
        visitAnchorZ: homeZ,
        visitTimer: 0,
        orbitPhase: i * 1.25,
        state: "roaming",
        targetChest: null,
        asleepInBubble: false,
        mesh: built.mesh,
        sculptedModel: built.sculptedModel,
        sproutBud: built.sproutBud,
        luminousCrest: built.luminousCrest,
        astralHalo: built.astralHalo,
        sleepBubbleMesh: built.sleepBubbleMesh,
      };

      this._applyStageVisuals(entry, entry.stage || 1);
      this.creatures.set(spec.id, entry);
    }
  }

  _applyStageVisuals(entry, stage) {
    if (!entry) return;
    const raw = Number(stage);
    const st = Number.isFinite(raw) ? Math.max(1, Math.min(3, Math.floor(raw))) : 1;
    const scales = { 1: 0.88, 2: 1.08, 3: 1.26 };
    entry.mesh.scale.setScalar(scales[st] || 0.88);
    entry.sproutBud.visible = st >= 1;
    entry.luminousCrest.visible = st >= 2;
    entry.astralHalo.visible = st >= 3;
  }

  getCreature(speciesId) {
    if (speciesId === "spirit_fox") return this.creatures.get("crystal_fox") || null;
    if (this.creatures.has(speciesId)) return this.creatures.get(speciesId);
    for (const entry of this.creatures.values()) {
      if (entry.spec.aliases.includes(speciesId)) return entry;
    }
    return null;
  }

  syncFromProgress(progress = {}, crossRealmUnlocks = {}) {
    for (const spec of CREATURE_SPECS) {
      const entry = this.creatures.get(spec.id);
      if (!entry) continue;
      let stage = computeCreatureStage(spec.id, progress);
      if (
        spec.id === "zero_g_toad" &&
        (crossRealmUnlocks?.astroToadUnlocked ||
          crossRealmUnlocks?.subZeroUnlocked ||
          crossRealmUnlocks?.subZeroAbyssUnlocked ||
          crossRealmUnlocks?.cryoToadMascot)
      ) {
        stage = Math.max(1, stage);
      }
      if (
        spec.id === "starlight_whale" &&
        (crossRealmUnlocks?.starlightWhaleSynced || crossRealmUnlocks?.skyWhaleUnlocked)
      ) {
        stage = Math.max(1, stage);
      }
      if (stage >= 1) {
        entry.hatched = true;
        entry.stage = stage;
        entry.mesh.visible = true;
        this._applyStageVisuals(entry, stage);
        if (spec.id === "zero_g_toad" && entry.state === "roaming") {
          entry.mesh.rotation.z = Math.PI;
          entry.state = "hover_orbit";
          entry.y = 6.2;
          entry.mesh.position.y = entry.y;
        }
      } else if (spec.id === "luminous_oddling") {
        entry.mesh.visible = true;
        this._applyStageVisuals(entry, 1);
      }
    }
  }

  triggerSubZeroToadAscent(depthVal = -100, callbacks = {}) {
    const toad = this.creatures.get("zero_g_toad");
    if (!toad) return null;

    const wasUnhatched = !toad.hatched || toad.stage === 0;
    toad.hatched = true;
    if (Math.abs(safeFiniteNum(depthVal, 0)) >= 100) {
      toad.stage = Math.max(toad.stage, 3);
    } else {
      toad.stage = Math.max(toad.stage, 1);
    }
    this._applyStageVisuals(toad, toad.stage);
    toad.mesh.visible = true;
    this._setSleepBubbleState(toad, false);

    const chest = this.skyChests[this.chestCounter % this.skyChests.length];
    this.chestCounter++;

    toad.targetChest = chest;
    toad.x = chest.x;
    toad.y = 1.65;
    toad.z = chest.z;
    toad.vy = 4.5;
    toad.state = "ascending";
    // Exact 180-degree upside-down roll in anti-gravity!
    toad.mesh.rotation.set(0, 0, Math.PI);
    toad.mesh.position.set(toad.x, toad.y, toad.z);

    if (wasUnhatched || Math.abs(safeFiniteNum(depthVal, 0)) > 0) {
      callbacks.onCreatureHatched?.({
        id: "zero_g_toad",
        name: toad.spec.name,
        stage: toad.stage,
      });
    }

    return toad;
  }

  _setSleepBubbleState(entry, asleep) {
    if (!entry) return;
    const flag = Boolean(asleep);
    entry.asleepInBubble = flag;
    entry.sleepBubbleMesh.visible = true;
    entry.sleepBubbleMesh.scale.setScalar(flag ? 1.0 : 0.0001);
    if (entry.sleepBubbleMesh.material) {
      entry.sleepBubbleMesh.material.opacity = flag ? 0.44 : 0.0;
    }
  }

  revealSpeciesInWorld(speciesId, targetPos = null, callbacks = {}) {
    const entry = this.getCreature(speciesId);
    if (!entry) return null;

    if (entry.id === "zero_g_toad" && safeFiniteNum(callbacks?.depthVal, 0) < 0) {
      return this.triggerSubZeroToadAscent(callbacks.depthVal, callbacks);
    }

    const wasUnhatched = !entry.hatched || entry.stage <= 0;
    const minStage = Math.max(1, Math.min(3, Math.floor(safeFiniteNum(callbacks?.minStage, 1))));
    entry.hatched = true;
    entry.stage = Math.max(1, Math.min(3, Math.floor(Math.max(entry.stage || 0, minStage))));
    this._applyStageVisuals(entry, entry.stage);
    entry.mesh.visible = true;
    this._setSleepBubbleState(entry, false);

    const nest = this.nests.find((n) => n.speciesId === entry.id);
    if (nest) {
      nest.sleepiness = 0;
    }

    const hasTarget =
      targetPos &&
      Number.isFinite(Number(targetPos.x)) &&
      Number.isFinite(Number(targetPos.z));

    if (entry.id === "starlight_whale") {
      entry.x = hasTarget ? Number(targetPos.x) : Math.cos(entry.orbitPhase) * 34.0;
      entry.z = hasTarget ? Number(targetPos.z) : -24.0 + Math.sin(entry.orbitPhase * 2.0) * 14.0;
      entry.y = 19.0;
      entry.mesh.position.set(entry.x, entry.y, entry.z);
    } else if (entry.id === "zero_g_toad") {
      entry.state = "hover_orbit";
      entry.y = 6.2;
      entry.mesh.rotation.set(0, 0, Math.PI);
      entry.mesh.position.set(entry.x, entry.y, entry.z);
    } else if (hasTarget) {
      const offset = callbacks?.exactAnchor ? 0 : 2.2;
      entry.visitAnchorX = Number(targetPos.x) + offset;
      entry.visitAnchorZ = Number(targetPos.z) + offset;
      entry.visitTimer = 6.0;
      entry.x = entry.visitAnchorX;
      entry.z = entry.visitAnchorZ;
      const gy = safeFiniteNum(this.sampleGroundY(entry.x, entry.z), 0);
      entry.y = gy + 0.55;
      entry.mesh.position.set(entry.x, entry.y, entry.z);
    } else {
      const gy = safeFiniteNum(this.sampleGroundY(entry.x, entry.z), 0);
      entry.y = gy + 0.55;
      entry.mesh.position.set(entry.x, entry.y, entry.z);
    }

    if (wasUnhatched) {
      callbacks?.onCreatureHatched?.({
        id: entry.id,
        name: entry.spec.name,
        stage: entry.stage,
      });
    }

    return entry;
  }

  revealSpiritGuideFox(targetPos = null, callbacks = {}) {
    return this.revealSpeciesInWorld("crystal_fox", targetPos, callbacks);
  }

  nudgeNestSleepiness(laneIdx, amount) {
    const nest = this.nests.find((n) => n.laneIdx === laneIdx);
    if (!nest) return;
    nest.sleepiness = Math.min(1.0, nest.sleepiness + Math.max(0, amount));
    if (nest.sleepiness >= 1.0) {
      const creature = this.creatures.get(nest.speciesId);
      if (creature && creature.hatched) {
        this._setSleepBubbleState(creature, true);
      }
    }
  }

  wakeCreatureAtLane(laneIdx) {
    const nest = this.nests.find((n) => n.laneIdx === laneIdx);
    if (!nest) return false;
    nest.sleepiness = 0;
    const creature = this.creatures.get(nest.speciesId);
    if (creature && creature.asleepInBubble) {
      this._setSleepBubbleState(creature, false);
      return true;
    }
    return false;
  }

  wakeCreaturesNear(cx, cz, radius) {
    let wokenCount = 0;
    for (const nest of this.nests) {
      const creature = this.creatures.get(nest.speciesId);
      const distNest = Math.hypot(nest.x - cx, nest.z - cz);
      const distCreature = creature ? Math.hypot(creature.x - cx, creature.z - cz) : Infinity;
      if (Math.min(distNest, distCreature) <= radius) {
        nest.sleepiness = 0;
        if (creature && creature.asleepInBubble) {
          this._setSleepBubbleState(creature, false);
          wokenCount++;
        }
      }
    }
    return wokenCount;
  }

  step(rawDt, rawElapsed = 0, callbacks = {}) {
    const dt = Math.min(0.05, Math.max(0, safeFiniteNum(rawDt, 0)));
    const elapsed = safeFiniteNum(rawElapsed, 0);
    for (const chest of this.skyChests) {
      if (chest.cooldown > 0) {
        chest.cooldown = Math.max(0, chest.cooldown - dt);
      }
      if (chest.bonkBounceTimer > 0) {
        chest.bonkBounceTimer = Math.max(0, chest.bonkBounceTimer - dt);
        const bounce = Math.sin((chest.bonkBounceTimer / 0.65) * Math.PI) * 0.48;
        chest.group.position.y = chest.baseY + bounce;
        chest.lidMesh.rotation.x = -1.1 * (chest.bonkBounceTimer / 0.65);
      } else {
        chest.group.position.y = chest.baseY + Math.sin(elapsed * 1.7 + chest.x) * 0.1;
        chest.lidMesh.rotation.x = 0;
      }
    }

    for (const entry of this.creatures.values()) {
      if (!entry.mesh.visible) continue;
      if (entry.astralHalo.visible) {
        entry.astralHalo.rotation.z += dt * 1.4;
      }

      if (entry.asleepInBubble) {
        this._setSleepBubbleState(entry, true);
        entry.mesh.position.y = entry.y + Math.sin(elapsed * 2.0 + entry.orbitPhase) * 0.12;
        continue;
      }

      if (entry.id === "zero_g_toad") {
        // Keep Zero-G Astro-Toad upside-down in anti-gravity!
        entry.mesh.rotation.z = Math.PI;
        if (entry.state === "ascending" && entry.targetChest) {
          entry.y += entry.vy * dt;
          entry.mesh.position.set(entry.x, entry.y, entry.z);
          const chest = entry.targetChest;
          if (entry.y >= chest.baseY - 0.95) {
            chest.bonkCount += 1;
            chest.bonkBounceTimer = 0.65;
            chest.cooldown = 8.0;
            chest.lidMesh.rotation.x = -1.1;
            entry.state = "hover_orbit";
            entry.y = chest.baseY - 1.35;
            entry.vy = 0;
            entry.mesh.position.set(entry.x, entry.y, entry.z);
            callbacks.audio?.playCreatureHatch?.(entry.stage || 1);
            callbacks.onWorldActivity?.(1, 5, "skyChestBonk");
            callbacks.onOppositionEvent?.({
              kind: "sky_chest_bonk",
              shardsEarned: 5,
              message: "Astro-Toad bonked a Sky-Chest!",
            });
          }
        } else if (entry.state === "hover_orbit") {
          entry.orbitPhase += dt * 1.2;
          const hoverY = 6.2 + Math.sin(entry.orbitPhase * 1.8) * 0.35;
          entry.x = Math.cos(entry.orbitPhase) * 5.2;
          entry.z = -5.5 + Math.sin(entry.orbitPhase) * 3.8;
          entry.y = hoverY;
          entry.mesh.position.set(entry.x, entry.y, entry.z);
          entry.mesh.rotation.y = -entry.orbitPhase;
          entry.mesh.rotation.z = Math.PI;
        }
        continue;
      }

      if (entry.id === "starlight_whale") {
        entry.orbitPhase += dt * 0.28;
        entry.x = Math.cos(entry.orbitPhase) * 34.0;
        entry.z = -24.0 + Math.sin(entry.orbitPhase * 2.0) * 14.0;
        entry.y = 19.0 + Math.sin(entry.orbitPhase * 3.0) * 2.2;
        entry.mesh.position.set(entry.x, entry.y, entry.z);
        const whaleVx = -Math.sin(entry.orbitPhase) * 34.0;
        const whaleVz = Math.cos(entry.orbitPhase * 2.0) * 28.0;
        entry.mesh.rotation.y = Math.atan2(whaleVx, whaleVz);
        const fins = entry.sculptedModel?.userData?.fins;
        if (fins) {
          const wave = Math.sin(elapsed * 2.4 + entry.orbitPhase) * 0.2;
          if (fins.leftFin) fins.leftFin.rotation.z = wave;
          if (fins.rightFin) fins.rightFin.rotation.z = -wave;
          if (fins.tailFluke) fins.tailFluke.rotation.x = Math.PI / 2 + wave * 0.65;
        }
        continue;
      }

      entry.orbitPhase += dt * 0.95;
      const roamR = entry.id === "luminous_oddling" ? 2.2 : 2.8;
      let centerX = entry.homeX;
      let centerZ = entry.homeZ;
      if (entry.visitTimer > 0) {
        entry.visitTimer = Math.max(0, entry.visitTimer - dt);
        const w = Math.min(1, entry.visitTimer / 1.5);
        centerX = entry.homeX + (entry.visitAnchorX - entry.homeX) * w;
        centerZ = entry.homeZ + (entry.visitAnchorZ - entry.homeZ) * w;
      }
      entry.x = centerX + Math.cos(entry.orbitPhase) * roamR;
      entry.z = centerZ + Math.sin(entry.orbitPhase) * roamR;
      const gy = safeFiniteNum(this.sampleGroundY(entry.x, entry.z), 0);
      const hop = entry.id === "luminous_oddling" ? Math.abs(Math.sin(entry.orbitPhase * 3.2)) * 0.38 : 0;
      entry.y = gy + 0.52 + hop;
      entry.mesh.position.set(entry.x, entry.y, entry.z);
      entry.mesh.rotation.y = -entry.orbitPhase + Math.PI / 2;
      if (entry.sculptedModel?.userData?.tail) {
        entry.sculptedModel.userData.tail.rotation.y = Math.sin(elapsed * 4.6 + entry.orbitPhase) * 0.26;
      }
    }
  }
}
