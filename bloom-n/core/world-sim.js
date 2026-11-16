/**
 * @bloom-n/world-sim — Pure Zero-DOM, Zero-Three.js World, Kinematics, Bullet-Time & Expedition Core
 * Runs identically in browser ES modules, headless Node QA suites, and Roblox Studio Luau ports
 * (ReplicatedStorage.BloomNWorldSim) with 100% deterministic math and zero rendering coupling.
 */

export const WORLD_SIM_VERSION = 1;
export const BULLET_TIME_SCALE = 0.08;
export const NORMAL_TIME_SCALE = 1.0;
export const NEAR_FIELD_STUB_MAX_RATIO = 0.12;

function finiteNum(val, fallback = 0) {
  const n = typeof val === "number" ? val : Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function clampNum(val, lo, hi, fallback = lo) {
  const n = finiteNum(val, fallback);
  return n < lo ? lo : n > hi ? hi : n;
}

function round3(val) {
  return Math.round(finiteNum(val, 0) * 1000) / 1000;
}

/**
 * Expanded Biome & Landmark Atlas across all 3 playable 3D Realms.
 * Coordinates map 1:1 to WebGL2 world units (meters) and Roblox Studio studs (1m = 3.5 studs).
 */
export const REALM_BIOME_ATLAS = {
  frostwake: [
    {
      id: "central_glacier",
      name: "Moonwell Glacier Basin",
      x: 0,
      z: 0,
      radius: 26,
      elevationY: 0.0,
      accentHex: 0x45f0df,
      isOuterFrontier: false,
      wonderCue: "Carve deep snow rivers around the central Moonwell",
    },
    {
      id: "south_garage_ridge",
      name: "Thermal Lift Outpost",
      x: 0,
      z: 28,
      radius: 18,
      elevationY: 0.2,
      accentHex: 0xf4a62a,
      isOuterFrontier: false,
      wonderCue: "Tune your rig hull and Magma Wide-Plow",
    },
    {
      id: "caldera_springs",
      name: "Thermal Geyser Caldera",
      x: -44,
      z: 22,
      radius: 20,
      elevationY: 0.6,
      accentHex: 0xffb347,
      isOuterFrontier: true,
      wonderCue: "Warm turquoise geysers launch hover-sleds skyward",
    },
    {
      id: "prism_cavern",
      name: "Prism Ice-Crystal Ridge",
      x: 45,
      z: -10,
      radius: 21,
      elevationY: 1.1,
      accentHex: 0x8be9fd,
      isOuterFrontier: true,
      wonderCue: "Singing crystal arches chime when your plow carves past",
    },
    {
      id: "subzero_trench",
      name: "Abyssal Rim Overlook",
      x: -42,
      z: -24,
      radius: 19,
      elevationY: -0.6,
      accentHex: 0x5aa9ff,
      isOuterFrontier: true,
      wonderCue: "Deep cobalt ice-spires guard ancient frozen relics",
    },
    {
      id: "aurora_causeway",
      name: "Northern Observatory Causeway",
      x: 0,
      z: -56,
      radius: 20,
      elevationY: 2.4,
      accentHex: 0xf7d06b,
      isOuterFrontier: true,
      wonderCue: "Starlight pylons crown the Household Observatory",
    },
  ],
  oddroot: [
    {
      id: "world_tree_heart",
      name: "World-Tree & Moonwell",
      x: 0,
      z: 0,
      radius: 17,
      elevationY: 0.0,
      accentHex: 0x5ef2c8,
      isOuterFrontier: false,
      wonderCue: "Luminous sanctuary spirits gather beside the Moonwell",
    },
    {
      id: "sun_terrace",
      name: "Sunbeam Entry Terrace",
      x: 0,
      z: 24,
      radius: 13,
      elevationY: 0.4,
      accentHex: 0xf7b955,
      isOuterFrontier: false,
      wonderCue: "Siphon golden Sun-Orbs and visit the Sanctuary Workshop",
    },
    {
      id: "cauldron_grove",
      name: "West Cauldron Grove",
      x: -24,
      z: -12,
      radius: 13,
      elevationY: 1.2,
      accentHex: 0x7ee081,
      isOuterFrontier: false,
      wonderCue: "Zero-pair elixirs bubble inside mossy stone cauldrons",
    },
    {
      id: "conservatory_looms",
      name: "East Conservatory Looms",
      x: 24,
      z: -12,
      radius: 13,
      elevationY: 1.2,
      accentHex: 0xc9a0ff,
      isOuterFrontier: false,
      wonderCue: "Living crystal vines weave luminous canopy bridges",
    },
    {
      id: "starlight_grotto",
      name: "Sunken Starlight Grotto",
      x: -41,
      z: 10,
      radius: 12.5,
      elevationY: 0.8,
      accentHex: 0x66e3ff,
      isOuterFrontier: true,
      wonderCue: "Glowing lagoon pearls drift beneath giant spore-caps",
    },
    {
      id: "skyroot_canopy",
      name: "Sky-Root Windward Spire",
      x: 41,
      z: 10,
      radius: 12.5,
      elevationY: 1.8,
      accentHex: 0xffd166,
      isOuterFrontier: true,
      wonderCue: "Soaring updraft rings lift your Starlight Glide-Cape",
    },
    {
      id: "observatory_ridge",
      name: "Northern Starlight Ridge",
      x: 0,
      z: -58,
      radius: 13,
      elevationY: 3.6,
      accentHex: 0x9ef0ff,
      isOuterFrontier: true,
      wonderCue: "Ancient brass astrolabes align with the night sky",
    },
  ],
  arc_bastion: [
    {
      id: "citadel_courtyard",
      name: "Sky-Citadel Courtyard",
      x: 0,
      z: 14,
      radius: 20,
      elevationY: 0.0,
      accentHex: 0x5aa9ff,
      isOuterFrontier: false,
      wonderCue: "Command the Sky-Bastion and test 0.08x Time-Aura",
    },
    {
      id: "clockwork_foundry",
      name: "Siegesmith Gear-Foundry",
      x: -10,
      z: 26,
      radius: 13,
      elevationY: 0.2,
      accentHex: 0xffd166,
      isOuterFrontier: false,
      wonderCue: "Forge Cryo-Gel Mortars and Clockwork Sentinels",
    },
    {
      id: "west_rampart",
      name: "West Prism Rampart",
      x: -26,
      z: -10,
      radius: 15,
      elevationY: 1.4,
      accentHex: 0x7ee8fa,
      isOuterFrontier: false,
      wonderCue: "Align piercing rail-beams across terraced sky-lanes",
    },
    {
      id: "east_rampart",
      name: "East Mortar Bastion",
      x: 26,
      z: -10,
      radius: 15,
      elevationY: 1.4,
      accentHex: 0xf7b955,
      isOuterFrontier: false,
      wonderCue: "Lob parabolic mortar arcs over stone shield-walls",
    },
    {
      id: "north_skybridge",
      name: "North Ballista Overlook",
      x: 0,
      z: -30,
      radius: 16,
      elevationY: 2.2,
      accentHex: 0x62f5e4,
      isOuterFrontier: true,
      wonderCue: "Snipe clockwork blimps in serene crystal bullet-time",
    },
    {
      id: "canyon_terraces",
      name: "Terraced Contraption Canyon",
      x: 0,
      z: -54,
      radius: 22,
      elevationY: -1.5,
      accentHex: 0xff9b71,
      isOuterFrontier: true,
      wonderCue: "Clockwork walkers march along marked elevation lanes",
    },
  ],
};

/**
 * Untimed, zero-pressure In-World Field Expeditions enriching free-roam exploration.
 * Every promptShort strictly obeys <= 6 words and zero banned or school labels.
 */
export const EXPEDITION_CATALOG = {
  frostwake: [
    {
      id: "fw_caldera_geysers",
      title: "Caldera Geyser Run",
      promptShort: "Ride 3 Thermal Caldera Geysers",
      icon: "⛲",
      shardReward: 14,
      accentHex: 0xffb347,
      waypoints: [
        { id: "g1", x: -34, y: 0.5, z: 16, label: "South Vent" },
        { id: "g2", x: -46, y: 0.7, z: 24, label: "Caldera Core" },
        { id: "g3", x: -38, y: 0.6, z: 32, label: "Steam Arch" },
      ],
    },
    {
      id: "fw_prism_chimes",
      title: "Prism Ridge Chimes",
      promptShort: "Ring 3 Prism Ridge Crystals",
      icon: "💎",
      shardReward: 15,
      accentHex: 0x8be9fd,
      waypoints: [
        { id: "c1", x: 36, y: 0.8, z: -2, label: "Cyan Spire" },
        { id: "c2", x: 46, y: 1.1, z: -12, label: "Prism Arch" },
        { id: "c3", x: 38, y: 0.9, z: -22, label: "Star Geode" },
      ],
    },
    {
      id: "fw_causeway_pylons",
      title: "Aurora Causeway Sweep",
      promptShort: "Light 3 North Star Pylons",
      icon: "🌟",
      shardReward: 16,
      accentHex: 0xf7d06b,
      waypoints: [
        { id: "p1", x: -16, y: 1.0, z: -38, label: "West Pylon" },
        { id: "p2", x: 0, y: 1.8, z: -48, label: "Crown Bridge" },
        { id: "p3", x: 16, y: 1.0, z: -38, label: "East Pylon" },
      ],
    },
  ],
  oddroot: [
    {
      id: "or_grotto_pearls",
      title: "Starlight Grotto Pearls",
      promptShort: "Gather 3 Grotto Star Pearls",
      icon: "🫧",
      shardReward: 14,
      accentHex: 0x66e3ff,
      waypoints: [
        { id: "s1", x: -34, y: 0.9, z: 6, label: "Moss Bridge" },
        { id: "s2", x: -42, y: 0.9, z: 12, label: "Grotto Pool" },
        { id: "s3", x: -38, y: 1.0, z: 16, label: "Spore Arch" },
      ],
    },
    {
      id: "or_skyroot_updrafts",
      title: "Sky-Root Updraft Rings",
      promptShort: "Glide 3 Sky-Root Wind Rings",
      icon: "🦋",
      shardReward: 15,
      accentHex: 0xffd166,
      waypoints: [
        { id: "u1", x: 34, y: 1.5, z: 6, label: "Breeze Span" },
        { id: "u2", x: 42, y: 1.9, z: 12, label: "Windward Spire" },
        { id: "u3", x: 38, y: 1.7, z: 16, label: "Sun Canopy" },
      ],
    },
    {
      id: "or_twilight_lanterns",
      title: "Moonwell Lotus Trail",
      promptShort: "Wake 3 Lotus Spirit Lanterns",
      icon: "🪷",
      shardReward: 16,
      accentHex: 0x5ef2c8,
      waypoints: [
        { id: "l1", x: -11, y: 0.3, z: 8, label: "West Petal" },
        { id: "l2", x: 11, y: 0.3, z: 8, label: "East Petal" },
        { id: "l3", x: 0, y: 2.1, z: -24, label: "North Cliff" },
      ],
    },
  ],
  arc_bastion: [
    {
      id: "ab_golden_gears",
      title: "Foundry Gear Caches",
      promptShort: "Collect 3 Golden Gear Caches",
      icon: "⚙️",
      shardReward: 14,
      accentHex: 0xffd166,
      waypoints: [
        { id: "k1", x: -18, y: 0.4, z: 12, label: "West Courtyard" },
        { id: "k2", x: 18, y: 0.4, z: 12, label: "East Courtyard" },
        { id: "k3", x: 0, y: 0.4, z: 24, label: "South Gate" },
      ],
    },
    {
      id: "ab_tesla_ramparts",
      title: "Rampart Prism Coils",
      promptShort: "Charge 3 Rampart Prism Coils",
      icon: "⚡",
      shardReward: 15,
      accentHex: 0x7ee8fa,
      waypoints: [
        { id: "t1", x: -24, y: 1.5, z: -4, label: "West Coil" },
        { id: "t2", x: 0, y: 2.2, z: -24, label: "Overlook Coil" },
        { id: "t3", x: 24, y: 1.5, z: -4, label: "East Coil" },
      ],
    },
    {
      id: "ab_origami_targets",
      title: "Skybridge Target Sweep",
      promptShort: "Tag 3 Clockwork Scout Buoys",
      icon: "🎯",
      shardReward: 16,
      accentHex: 0x62f5e4,
      waypoints: [
        { id: "b1", x: -14, y: 1.2, z: -18, label: "Port Buoy" },
        { id: "b2", x: 14, y: 1.2, z: -18, label: "Starboard Buoy" },
        { id: "b3", x: 0, y: 0.2, z: 4, label: "Bastion Core" },
      ],
    },
  ],
};

/**
 * Enforces both Mandatory Math-Pause (exact bitwise 0.0 oppositionDt while dock/approach is active)
 * and Arc Bastion's serene 0.08x Tactician Bullet-Time Aura.
 */
export function computeSimulationTimeScale({
  dt = 1 / 60,
  encounterDockOpen = false,
  activeGateSlot = false,
  bulletTimeRequested = false,
  realmId = "frostwake",
} = {}) {
  const safeDt = clampNum(dt, 0, 0.1, 1 / 60);
  const mathPaused = Boolean(encounterDockOpen || activeGateSlot);
  const bulletTimeActive = Boolean(
    bulletTimeRequested || (realmId === "arc_bastion" && mathPaused)
  );
  const timeScale = bulletTimeActive ? BULLET_TIME_SCALE : NORMAL_TIME_SCALE;

  return {
    rawDt: safeDt,
    worldDt: safeDt,
    // Clinical & E2E invariant: bitwise 0.0 opposition delta whenever math dock/gate is active
    oppositionDt: mathPaused ? 0.0 : safeDt * (bulletTimeActive ? BULLET_TIME_SCALE : 1.0),
    ambientDt: safeDt * timeScale,
    timeScale,
    bulletTimeActive,
    mathPaused,
  };
}

/**
 * Pure planar kinematics step for Terra-Rigs (Frostwake), Sanctuary Mounts (Oddroot),
 * and Siege-Rovers (Arc Bastion). Maps 1:1 to Roblox RunService.Heartbeat vehicle controllers.
 */
export function stepVehicleKinematics(state = {}, input = {}, spec = {}, dt = 1 / 60) {
  const safeDt = clampNum(dt, 0, 0.1, 1 / 60);
  const x0 = finiteNum(state.x, 0);
  const y0 = finiteNum(state.y, 0);
  const z0 = finiteNum(state.z, 0);
  const heading0 = finiteNum(state.heading, 0);
  const speed0 = finiteNum(state.speed, 0);

  const throttle = clampNum(input.throttle, -1, 1, 0);
  const steer = clampNum(input.steer, -1, 1, 0);
  const boostMult = input.boostActive ? finiteNum(spec.boostMultiplier, 1.28) : 1.0;
  const slipstreamMult = clampNum(input.slipstreamMultiplier, 1.0, 1.65, 1.0);
  const dragMult = clampNum(input.surfaceSpeedFactor, 0.35, 1.35, 1.0);

  const topSpeed = finiteNum(spec.topSpeed, 18.0) * boostMult * slipstreamMult * dragMult;
  const turnRate = finiteNum(spec.turnRate, 2.6);
  const accelRate = finiteNum(spec.accelRate, 9.5);
  const decelRate = finiteNum(spec.decelRate, 7.2);
  const maxRadius = finiteNum(spec.maxRadius, 68);

  const targetSpeed =
    throttle >= 0 ? throttle * topSpeed : throttle * topSpeed * 0.58;
  const rate = Math.abs(targetSpeed) > Math.abs(speed0) ? accelRate : decelRate;
  const blend = Math.min(1, safeDt * rate);
  let nextSpeed = speed0 + (targetSpeed - speed0) * blend;
  if (Math.abs(throttle) < 0.01 && Math.abs(nextSpeed) < 0.04) {
    nextSpeed = 0;
  }

  const reverseSign = nextSpeed < -0.25 ? -1 : 1;
  const steerAuthority = 0.45 + 0.55 * Math.min(1, Math.abs(nextSpeed) / 4.5 + Math.abs(steer) * 0.35);
  const rawHeading = heading0 - steer * turnRate * steerAuthority * reverseSign * safeDt;
  const nextHeading = Math.atan2(Math.sin(rawHeading), Math.cos(rawHeading));

  const forwardX = -Math.sin(nextHeading);
  const forwardZ = -Math.cos(nextHeading);
  const vx = forwardX * nextSpeed;
  const vz = forwardZ * nextSpeed;

  let nx = x0 + vx * safeDt;
  let nz = z0 + vz * safeDt;

  const r = Math.hypot(nx, nz);
  if (maxRadius > 0 && r > maxRadius) {
    const scale = maxRadius / r;
    nx *= scale;
    nz *= scale;
    nextSpeed *= 0.78;
  }

  const stepDist = Math.hypot(nx - x0, nz - z0);
  const targetRoll = clampNum(steer * (nextSpeed / Math.max(8, topSpeed)) * 0.16, -0.22, 0.22, 0);
  const targetPitch = clampNum(-(nextSpeed - speed0) * 0.025, -0.18, 0.18, 0);
  const smoothTilt = Math.min(1, safeDt * 10);

  return {
    x: nx,
    y: y0,
    z: nz,
    vx,
    vz,
    heading: nextHeading,
    speed: nextSpeed,
    roll: finiteNum(state.roll, 0) + (targetRoll - finiteNum(state.roll, 0)) * smoothTilt,
    pitch: finiteNum(state.pitch, 0) + (targetPitch - finiteNum(state.pitch, 0)) * smoothTilt,
    distTraveled: finiteNum(state.distTraveled, 0) + stepDist,
  };
}

/**
 * Resolves which named biome / outer landmark zone a player currently occupies.
 */
export function resolveActiveBiome(realmId = "frostwake", x = 0, z = 0) {
  const list = REALM_BIOME_ATLAS[realmId] || REALM_BIOME_ATLAS.frostwake;
  const px = finiteNum(x, 0);
  const pz = finiteNum(z, 0);

  let best = list[0];
  let bestScore = Infinity;
  for (const b of list) {
    const dist = Math.hypot(px - b.x, pz - b.z);
    const normalized = dist / Math.max(1, b.radius);
    if (normalized < bestScore) {
      bestScore = normalized;
      best = b;
    }
  }
  return {
    ...best,
    insideRadius: bestScore <= 1.05,
    distanceM: round3(Math.hypot(px - best.x, pz - best.z)),
  };
}

/**
 * Creates a deterministic, untimed Field Expedition state for a realm.
 */
export function createFieldExpeditionState(realmId = "frostwake", completedCount = 0) {
  const templates = EXPEDITION_CATALOG[realmId] || EXPEDITION_CATALOG.frostwake;
  const safeCompleted = Math.max(0, Math.floor(finiteNum(completedCount, 0)));
  const idx = safeCompleted % templates.length;
  const tpl = templates[idx];
  return {
    realmId,
    expeditionId: tpl.id,
    templateIndex: idx,
    title: tpl.title,
    promptShort: tpl.promptShort,
    icon: tpl.icon,
    shardReward: tpl.shardReward,
    accentHex: tpl.accentHex,
    waypoints: tpl.waypoints.map((w) => ({ ...w, collected: false })),
    collectedCount: 0,
    targetCount: tpl.waypoints.length,
    completedTotal: safeCompleted,
  };
}

/**
 * Advances the active Field Expedition when the player's rig/mount/rover touches a waypoint.
 * Zero timers, zero failure states — upon collecting all 3 waypoints, awards bonus shards
 * and seamlessly queues the next expedition!
 */
export function stepFieldExpedition(expState, x = 0, z = 0, hitRadius = 5.4) {
  if (!expState || !Array.isArray(expState.waypoints)) {
    const fresh = createFieldExpeditionState("frostwake", 0);
    return {
      state: fresh,
      justCollectedWaypoint: null,
      justCompletedExpedition: null,
      shardsEarned: 0,
    };
  }

  const px = finiteNum(x, 0);
  const pz = finiteNum(z, 0);
  const rad = Math.max(1.5, finiteNum(hitRadius, 5.4));

  let hitWp = null;
  const nextWaypoints = expState.waypoints.map((w) => {
    if (w.collected || hitWp) return w;
    const d = Math.hypot(px - w.x, pz - w.z);
    if (d <= rad) {
      hitWp = w;
      return { ...w, collected: true };
    }
    return w;
  });

  if (!hitWp) {
    return {
      state: expState,
      justCollectedWaypoint: null,
      justCompletedExpedition: null,
      shardsEarned: 0,
    };
  }

  const collectedCount = nextWaypoints.filter((w) => w.collected).length;
  if (collectedCount >= nextWaypoints.length) {
    const nextTotal = (expState.completedTotal || 0) + 1;
    const nextState = createFieldExpeditionState(expState.realmId, nextTotal);
    return {
      state: nextState,
      justCollectedWaypoint: hitWp,
      justCompletedExpedition: {
        expeditionId: expState.expeditionId,
        title: expState.title,
        icon: expState.icon,
        shardReward: expState.shardReward,
        completedTotal: nextTotal,
      },
      shardsEarned: expState.shardReward,
    };
  }

  return {
    state: {
      ...expState,
      waypoints: nextWaypoints,
      collectedCount,
    },
    justCollectedWaypoint: hitWp,
    justCompletedExpedition: null,
    shardsEarned: 2,
  };
}

/**
 * Samples a 3D trajectory curve while strictly enforcing the Near-Field Anti-Scrub Law:
 * pre-commit (`committed === false`), the preview span NEVER exceeds `NEAR_FIELD_STUB_MAX_RATIO` (12% <= 15%).
 */
export function sampleTrajectoryArc({
  mode = "linear",
  m = 1,
  b = 0,
  a = -1,
  h = 3,
  k = 10,
  r1 = 1,
  r2 = 5,
  spanX = 12,
  committed = false,
  sampleCount = 24,
} = {}) {
  const fullSpan = Math.max(2, finiteNum(spanX, 12));
  const activeSpanRatio = committed ? 1.0 : NEAR_FIELD_STUB_MAX_RATIO;
  const maxX = fullSpan * activeSpanRatio;
  const n = Math.max(4, Math.min(64, Math.floor(finiteNum(sampleCount, 24))));
  const points = [];

  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = maxX * t;
    let y = 0;
    if (mode === "quadratic_vertex") {
      y = finiteNum(a, -1) * Math.pow(x - finiteNum(h, 3), 2) + finiteNum(k, 10);
    } else if (mode === "quadratic_roots") {
      y = finiteNum(a, -1) * (x - finiteNum(r1, 1)) * (x - finiteNum(r2, 5));
    } else {
      y = finiteNum(m, 1) * x + finiteNum(b, 0);
    }
    points.push({ x: round3(x), y: round3(y), t: round3(t) });
  }

  return {
    mode,
    committed: Boolean(committed),
    spanRatio: activeSpanRatio,
    fullSpanX: fullSpan,
    renderedSpanX: round3(maxX),
    points,
  };
}

/**
 * Computes the exact coordinate miss-splatter & vertical delta caliper (`deltaY`)
 * for Arc Bastion's Splatoon Cryo-Gel shells, Frostwake Holo-Ramps, and Oddroot Vine-Rails.
 */
export function computeCoordinateSplatter({
  committedValue = 0,
  answer = 0,
  targetX = 8,
  targetY = 6,
  scaleY = 0.35,
} = {}) {
  const cVal = finiteNum(committedValue, 0);
  const ans = finiteNum(answer, 0);
  const rawDelta = cVal - ans;
  const clampedOffsetY = clampNum(rawDelta * finiteNum(scaleY, 0.35), -8.5, 8.5, 0);
  const impactY = finiteNum(targetY, 6) + clampedOffsetY;

  return {
    hit: Math.abs(rawDelta) < 1e-6,
    committedValue: cVal,
    answer: ans,
    algebraicDelta: round3(rawDelta),
    impactX: round3(targetX),
    impactY: round3(impactY),
    targetY: round3(targetY),
    caliperHeight: round3(Math.abs(impactY - finiteNum(targetY, 6))),
    cryoSlowRadiusM: 6.5,
  };
}

/**
 * Produces a compact, JSON-serializable state table ready for Roblox RemoteEvent / DataStore parity.
 */
export function exportRobloxSimSnapshot({
  realmId = "frostwake",
  vehicleState = {},
  timeScaleState = {},
  expeditionState = null,
} = {}) {
  const biome = resolveActiveBiome(realmId, vehicleState.x, vehicleState.z);
  return {
    v: WORLD_SIM_VERSION,
    realmId,
    pose: {
      x: round3(vehicleState.x),
      y: round3(vehicleState.y),
      z: round3(vehicleState.z),
      heading: round3(vehicleState.heading),
      speed: round3(vehicleState.speed),
      studsX: round3(finiteNum(vehicleState.x, 0) * 3.5),
      studsY: round3(finiteNum(vehicleState.y, 0) * 3.5),
      studsZ: round3(finiteNum(vehicleState.z, 0) * 3.5),
    },
    biomeId: biome.id,
    biomeName: biome.name,
    timeScale: finiteNum(timeScaleState.timeScale, 1.0),
    bulletTimeActive: Boolean(timeScaleState.bulletTimeActive),
    mathPaused: Boolean(timeScaleState.mathPaused),
    expedition: expeditionState
      ? {
          id: expeditionState.expeditionId,
          collectedCount: expeditionState.collectedCount,
          targetCount: expeditionState.targetCount,
          completedTotal: expeditionState.completedTotal,
        }
      : null,
  };
}
