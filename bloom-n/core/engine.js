/**
 * @bloom-n/core — Pure Adaptive Curriculum, Stealth-Teaching & Anxiety-Safety Engine
 * Zero DOM dependencies. Runs identically in browser ES modules, Node QA suites,
 * and future roblox-ts / Luau ports.
 */

export const ENGINE_VERSION = 1;

export const BANNED_CHILD_WORDS = [
  "wrong",
  "incorrect",
  "fail",
  "failed",
  "failure",
  "defeated",
  "quiz",
  "drill",
  "hurry",
  "time's up",
  "times up",
  "oops",
  "stupid",
  "slow",
];

export const SUB_GAMES = [
  {
    id: "frostwake",
    order: 1,
    title: "Frostwake: Flux Terra-Rigs",
    subtitle: "3D Snow-Plow & Aurora Hover-Sled Valley",
    status: "live",
    badge: "PLAY NOW · 3D LIVE",
    banner: "assets/realm1-frostwake.jpg",
    accent: "#38d9c0",
    blurb: "Carve deep snow trails, shatter cryo-gates, and surf 3D holo-ramps.",
  },
  {
    id: "oddroot",
    order: 2,
    title: "Oddroot Wilds: Alchemy Sanctuary",
    subtitle: "3D Bioluminescent Creature & Ratio Conservatory",
    status: "preview",
    badge: "REALM 2 · NEXT UP",
    banner: "assets/realm2-oddroot.jpg",
    accent: "#7ee081",
    blurb: "Brew zero-pair elixirs, weave crystal looms, and hatch spirit creatures.",
  },
  {
    id: "stardrift",
    order: 3,
    title: "Stardrift Isles & Titan Astrolabes",
    subtitle: "3D Sky-Ship Archipelagos & Brass Star-Ring Proofs",
    status: "astrolabe_linked",
    badge: "REALM 3 · SKY-ASTROLABES ACTIVE IN W5",
    banner: "assets/realm3-stardrift.jpg",
    accent: "#f5c451",
    blurb: "Align giant brass astrolabes and glide across parabolic sky-bridges.",
  },
  {
    id: "arc_bastion",
    order: 4,
    title: "Arc Bastion: Siegesmiths",
    subtitle: "3D Bullet-Time Fortress & Trajectory Defense",
    status: "preview",
    badge: "REALM 4 · ROADMAP",
    banner: "assets/realm4-bastion.jpg",
    accent: "#5aa9ff",
    blurb: "Freeze beast raids in 0.08x bullet-time and dial parabolic arc shields.",
  },
];

export const RIG_CHASSIS = [
  {
    id: "terra_dozer",
    name: "6x6 Thermal Dozer",
    tag: "Heavy Snow-Carver",
    icon: "🚜",
    plowWidth: 3.1,
    topSpeed: 17.5,
    turnRate: 2.5,
    primaryHex: 0xf4a62a,
    secondaryHex: 0x24344d,
    glowHex: 0x45f0df,
  },
  {
    id: "aurora_sled",
    name: "Aurora Crystal Glider",
    tag: "Sleek Hover-Skiff",
    icon: "🛸",
    plowWidth: 2.9,
    topSpeed: 19.2,
    turnRate: 3.0,
    primaryHex: 0x5ce1e6,
    secondaryHex: 0x1c2b4b,
    glowHex: 0xf7d06b,
  },
];

export const RIG_UPGRADES = [
  {
    id: "wide_blade",
    name: "Magma Wide-Plow",
    cost: 45,
    icon: "🔥",
    shortDesc: "+55% snow carve width",
  },
  {
    id: "ion_boosters",
    name: "Twin Ion Thrusters",
    cost: 70,
    icon: "⚡",
    shortDesc: "+30% rig boost speed",
  },
  {
    id: "spirit_fox",
    name: "Arctic Spirit-Fox",
    cost: 95,
    icon: "🦊",
    shortDesc: "3D companion runs beside you",
  },
  {
    id: "prismatic_trail",
    name: "Aurora Bloom Wake",
    cost: 130,
    icon: "🌈",
    shortDesc: "Flowers & prism river in snow",
  },
  {
    id: "titan_harpoon",
    name: "Starlight Winch",
    cost: 175,
    icon: "🪝",
    shortDesc: "Golden lightning cliff cable",
  },
  {
    id: "celestial_crown",
    name: "Celestial Trim",
    cost: 240,
    icon: "👑",
    shortDesc: "Radiant gold & starlight hull",
  },
];

export const MYSTERIES = [
  {
    id: "moon_center",
    title: "The Moon in the Middle",
    clue: "Rest at valley center (0, 0)",
    reward: "Silver Moon Halo",
  },
  {
    id: "subzero_abyss",
    title: "Deepest Sub-Zero Core",
    clue: "Clear a gate below -99",
    reward: "Abyssal Ice Beacon",
  },
  {
    id: "aurora_whale",
    title: "Song of the Sky-Whale",
    clue: "Chain 3 Mental Overdrives",
    reward: "Sky-Whale Breach Overhead",
  },
  {
    id: "astrolabe_lock",
    title: "Keeper of the Brass Ring",
    clue: "Align a Sky-Astrolabe shrine",
    reward: "Golden Compass Rose",
  },
  {
    id: "rainbow_surfer",
    title: "Caldera Crest Rider",
    clue: "Surf a Holo-Ramp or Arch",
    reward: "Prismatic Jet Plume",
  },
];

export const WORLDS = [
  {
    id: "W0",
    index: 0,
    name: "Calibration Glacier",
    gradeSpan: "Warm-Up",
    strand: "braided",
    accent: "#6be6d3",
    summary: "6 playful gates tune your starting frontier.",
    nodes: [
      { id: "W0.1", title: "Sun Balance", strand: "algebra", kind: "eq_add" },
      { id: "W0.2", title: "Sub-Zero Drop", strand: "algebra", kind: "eq_subzero_extreme" },
      { id: "W0.3", title: "Polarity Flip", strand: "algebra", kind: "int_polarity" },
      { id: "W0.4", title: "Crystal Pattern", strand: "functions", kind: "seq_linear" },
      { id: "W0.5", title: "Twin Monolith", strand: "algebra", kind: "eq_twostep" },
      { id: "W0.6", title: "Canyon Lift", strand: "functions", kind: "ramp_linear" },
    ],
  },
  {
    id: "W1",
    index: 1,
    name: "Sub-Zero Core",
    gradeSpan: "Pre-Algebra I",
    strand: "algebra",
    accent: "#4ad8ff",
    summary: "Directed integers, zero-pairs, and extreme sub-zero shafts.",
    nodes: [
      { id: "W1.1", title: "Zero-Pair Melt", strand: "algebra", kind: "eq_cross_zero" },
      { id: "W1.2", title: "Deep Ice Shafts", strand: "algebra", kind: "eq_subzero_extreme" },
      { id: "W1.3", title: "Vacuum Lift", strand: "algebra", kind: "int_double_neg" },
      { id: "W1.4", title: "Polarity Mirror", strand: "algebra", kind: "int_polarity" },
    ],
  },
  {
    id: "W2",
    index: 2,
    name: "Pattern Loom & Forge",
    gradeSpan: "Pre-Algebra II",
    strand: "functions",
    accent: "#7ee081",
    summary: "Visual growth rules, distributive arrays, exponents, and mirror beams.",
    nodes: [
      { id: "W2.1", title: "Crystal Loom", strand: "functions", kind: "seq_linear" },
      { id: "W2.2", title: "Array Merger", strand: "algebra", kind: "expr_distribute" },
      { id: "W2.3", title: "Power Cores", strand: "algebra", kind: "exp_power" },
      { id: "W2.4", title: "Parallel Mirrors", strand: "geometry", kind: "geo_parallel_angles" },
    ],
  },
  {
    id: "W3",
    index: 3,
    name: "Equilibrium Monoliths",
    gradeSpan: "Algebra 1 Bridge",
    strand: "algebra",
    accent: "#f7b955",
    summary: "Camouflaged two-step locks, parenthesis unpackers, and twin-tower clashes.",
    nodes: [
      { id: "W3.1", title: "Camouflage Locks", strand: "algebra", kind: "eq_twostep_camo" },
      { id: "W3.2", title: "Prism Unpacker", strand: "algebra", kind: "eq_parens" },
      { id: "W3.3", title: "Twin-Tower Clash", strand: "algebra", kind: "eq_both_sides" },
      { id: "W3.4", title: "Scale-Rig Sails", strand: "geometry", kind: "geo_scale_area" },
    ],
  },
  {
    id: "W4",
    index: 4,
    name: "Holo-Ramp Canyon",
    gradeSpan: "Algebra 1 Core",
    strand: "functions",
    accent: "#38d9c0",
    summary: "Extrude 3D slope ramps y = mx + b and dual-rig beacon intersections.",
    nodes: [
      { id: "W4.1", title: "Rise-Run Jump", strand: "functions", kind: "ramp_slope_only" },
      { id: "W4.2", title: "Holo-Ramp y=mx+b", strand: "functions", kind: "ramp_linear" },
      { id: "W4.3", title: "Relay Anchor", strand: "functions", kind: "ramp_point_target" },
      { id: "W4.4", title: "Dual-Rig Crossing", strand: "functions", kind: "sys_intersection" },
    ],
  },
  {
    id: "W5",
    index: 5,
    name: "Titan Astrolabe Peaks",
    gradeSpan: "Geometry & Trig",
    strand: "geometry",
    accent: "#f5c451",
    summary: "Brass Sky-Astrolabes, rigid triangle trusses, and Pythagorean cliff harpoons.",
    nodes: [
      { id: "W5.1", title: "Crystal Truss 180°", strand: "geometry", kind: "geo_triangle_truss" },
      { id: "W5.2", title: "Sky-Astrolabe Ring", strand: "geometry", kind: "geo_astrolabe_thales" },
      { id: "W5.3", title: "Cliff Harpoon c²", strand: "geometry", kind: "geo_pythagoras" },
      { id: "W5.4", title: "Trig Crest Winch", strand: "geometry", kind: "geo_trig_ratio" },
    ],
  },
  {
    id: "W6",
    index: 6,
    name: "Rainbow Arch Caldera",
    gradeSpan: "Algebra 1.5 / 2",
    strand: "functions",
    accent: "#ff9b71",
    summary: "Surf parabolic vertex arches, twin-root bridges, and 3D square slabs.",
    nodes: [
      { id: "W6.1", title: "Vertex Arch Peak", strand: "functions", kind: "arch_vertex_eval" },
      { id: "W6.2", title: "Twin-Root Span", strand: "functions", kind: "arch_roots" },
      { id: "W6.3", title: "Square-Slab Forge", strand: "algebra", kind: "quad_complete_sq" },
    ],
  },
  {
    id: "W7",
    index: 7,
    name: "Aurora Horizon",
    gradeSpan: "Algebra 2",
    strand: "functions",
    accent: "#66e3ff",
    summary: "Exponential crystal cascades, log stage-dials, and harmonic ice waves.",
    nodes: [
      { id: "W7.1", title: "Cascade Doubler", strand: "functions", kind: "exp_growth" },
      { id: "W7.2", title: "Log Stage Dial", strand: "functions", kind: "log_stage" },
      { id: "W7.3", title: "Harmonic Crest", strand: "functions", kind: "trig_wave_crest" },
    ],
  },
];

export const NODE_MAP = Object.fromEntries(
  WORLDS.flatMap((w) => w.nodes.map((n) => [n.id, { ...n, worldId: w.id, worldIndex: w.index, worldName: w.name }]))
);

function pick(arr, rng = Math.random) {
  return arr[Math.floor(rng() * arr.length)];
}

function randInt(min, max, rng = Math.random) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function createInitialProgress(preset = "auto") {
  const nodes = {};
  for (const w of WORLDS) {
    for (const n of w.nodes) {
      nodes[n.id] = {
        pKnow: w.index === 0 ? 0.35 : 0.15,
        stage: 0, // 0 Exploring, 1 Structuring, 2 Consolidating, 3 Mastered
        attempts: 0,
        wins: 0,
        overdrives: 0,
        camouflageCleared: false,
        avgPlanMs: 0,
        avgExecMs: 0,
        lastSeenAt: 0,
      };
    }
  }

  const unlockedWorlds = ["W0", "W1"];
  let activeWorld = "W0";
  let calibrated = false;

  if (preset === "david") {
    calibrated = true;
    activeWorld = "W1";
    nodes["W1.1"].stage = 2;
    nodes["W1.1"].pKnow = 0.82;
    unlockedWorlds.push("W2");
  } else if (preset === "sarah") {
    calibrated = true;
    activeWorld = "W2";
    for (const id of ["W1.1", "W1.2", "W1.3", "W1.4"]) {
      nodes[id].stage = 3;
      nodes[id].pKnow = 0.94;
    }
    unlockedWorlds.push("W2", "W3", "W4");
  }

  return {
    version: ENGINE_VERSION,
    rev: Date.now(),
    calibrated,
    calibrationStep: 0,
    calibrationHits: [],
    activeWorld,
    unlockedWorlds,
    sandboxAllUnlocked: false,
    fluxShards: 30,
    unsyncedFlux: 0,
    totalSolved: 0,
    snowClearedM2: 0,
    equippedChassis: "terra_dozer",
    ownedUpgrades: [],
    discoveredMysteries: [],
    misconceptionTags: {},
    records: {
      bestOverdriveStreak: 0,
      longestRampM: 0,
      deepestSubZero: 0,
      foxesWoken: 0,
    },
    nodes,
  };
}

export function createSessionState() {
  return {
    friction: 0,
    consecutiveMisses: 0,
    consecutiveWins: 0,
    overdriveStreak: 0,
    shelvedIds: [],
    surgeQueue: [],
    inSurge: false,
    recentNodeIds: [],
    shelvedLog: [],
  };
}

/**
 * Formats linear expression `a*n + b` cleanly without awkward `+ -` signs.
 */
export function formatLinearExpr(a, b, v = "n", camoOrder = false) {
  if (a === 0) return String(b);
  const vPart = a === 1 ? v : a === -1 ? `-${v}` : `${a}${v}`;
  if (b === 0) return vPart;
  if (camoOrder) {
    return a > 0 ? `${b} + ${a === 1 ? v : `${a}${v}`}` : `${b} - ${a === -1 ? v : `${Math.abs(a)}${v}`}`;
  }
  return b > 0 ? `${vPart} + ${b}` : `${vPart} - ${Math.abs(b)}`;
}

/**
 * Generates a deterministic or RNG-seeded 3D spatial encounter for a given nodeId.
 * All child-facing copy strictly obeys <= 6 words and zero banned shame words.
 */
export function generateEncounter(nodeId, options = {}) {
  const rng = options.rng || Math.random;
  const meta = NODE_MAP[nodeId] || NODE_MAP["W1.1"];
  const camo = Boolean(options.camouflage) || meta.kind === "eq_twostep_camo";
  const uid = `${nodeId}-${Date.now().toString(36)}-${randInt(100, 999, rng)}`;

  switch (meta.kind) {
    case "eq_add": {
      const n = randInt(4, 16, rng);
      const a = randInt(3, 12, rng);
      const rhs = n + a;
      return makeEquationEncounter({
        uid,
        nodeId,
        meta,
        promptShort: "Balance both crystal towers",
        displayEq: `n + ${a} = ${rhs}`,
        answer: n,
        left: { a: 1, b: a },
        right: { a: 0, b: rhs },
        detents: [-10, -5, -1, 1, 5, 10],
        startDial: 0,
      });
    }

    case "eq_cross_zero": {
      const n = -randInt(3, 18, rng);
      const a = randInt(6, 22, rng);
      const rhs = n + a;
      return makeEquationEncounter({
        uid,
        nodeId,
        meta,
        promptShort: "Melt blocks to balance n",
        displayEq: `n + ${a} = ${rhs}`,
        answer: n,
        left: { a: 1, b: a },
        right: { a: 0, b: rhs },
        detents: [-10, -5, -1, 1, 5, 10],
        startDial: 0,
      });
    }

    case "eq_subzero_extreme": {
      // Directly inspired by David's n + 100 = 100 - 200!
      const step = pick([10, 20, 25, 50, 100], rng);
      const k1 = randInt(1, 4, rng) * step;
      const k2 = randInt(1, 3, rng) * step;
      const k3 = randInt(2, 5, rng) * step;
      const rhs = k2 - k3;
      const n = rhs - k1;
      return makeEquationEncounter({
        uid,
        nodeId,
        meta,
        promptShort: "Drop into sub-zero balance",
        displayEq: `n + ${k1} = ${k2} - ${k3}`,
        answer: n,
        left: { a: 1, b: k1 },
        right: { a: 0, b: rhs },
        detents: [-100, -25, -5, 5, 25, 100],
        startDial: 0,
      });
    }

    case "int_double_neg": {
      const base = randInt(-20, 30, rng);
      const lift = randInt(5, 25, rng);
      const ans = base + lift;
      return {
        uid,
        nodeId,
        worldId: meta.worldId,
        strand: meta.strand,
        encounterType: "cryo_gate",
        title: meta.title,
        promptShort: "Vacuum ice blocks: lift up!",
        equationText: `${base} - (-${lift}) = n`,
        targetLabel: "n",
        answer: ans,
        startDial: base,
        detents: [-10, -5, -1, 1, 5, 10],
        towers: { leftA: 0, leftB: ans, rightA: 1, rightB: 0 },
        beamActions: [
          {
            id: "flip_neg",
            label: `Flip -(-${lift}) → +${lift}`,
            kind: "hint_transform",
            nextEquationText: `${base} + ${lift} = n`,
            cue: "Pulling ice lifts you up!",
          },
        ],
        visualHint: `Removing ${lift} ice weights floats +${lift} higher`,
      };
    }

    case "int_polarity": {
      const a = -randInt(2, 9, rng);
      const b = pick([-8, -6, -5, -4, -3, 4, 6], rng);
      const ans = a * b;
      return {
        uid,
        nodeId,
        worldId: meta.worldId,
        strand: meta.strand,
        encounterType: "cryo_gate",
        title: meta.title,
        promptShort: "Aim the polarity mirror beam",
        equationText: `(${a}) × (${b}) = n`,
        targetLabel: "n",
        answer: ans,
        startDial: 0,
        detents: [-10, -5, -1, 1, 5, 10],
        towers: { leftA: 0, leftB: ans, rightA: 1, rightB: 0 },
        beamActions: [
          {
            id: "sign_check",
            label: b < 0 ? "Twin negatives → +beam" : "One negative → -beam",
            kind: "hint_transform",
            nextEquationText: `${b < 0 ? "+" : "-"}(${Math.abs(a)} × ${Math.abs(b)}) = n`,
            cue: b < 0 ? "Double flip shines positive!" : "Single flip shines sub-zero!",
          },
        ],
        visualHint: `${Math.abs(a)} groups of ${Math.abs(b)} with polarity flip`,
      };
    }

    case "seq_linear": {
      const m = randInt(2, 6, rng);
      const b = randInt(-3, 7, rng);
      const targetStep = pick([8, 10, 12, 15, 20], rng);
      const t1 = m * 1 + b;
      const t2 = m * 2 + b;
      const t3 = m * 3 + b;
      const ans = m * targetStep + b;
      return {
        uid,
        nodeId,
        worldId: meta.worldId,
        strand: meta.strand,
        encounterType: "aurora_cascade",
        title: meta.title,
        promptShort: `Predict crystal count at step ${targetStep}`,
        equationText: `Step 1:${t1} · 2:${t2} · 3:${t3} → Step ${targetStep}?`,
        targetLabel: `Step ${targetStep}`,
        answer: ans,
        startDial: t3,
        detents: [-10, -5, -1, 1, 5, 10],
        patternMeta: { m, b, terms: [t1, t2, t3], targetStep },
        beamActions: [
          {
            id: "show_growth",
            label: `Show growth (+${m}/step)`,
            kind: "hint_transform",
            nextEquationText: `Rule: ${formatLinearExpr(m, b, "k")} → ${m}(${targetStep}) ${b >= 0 ? "+ " + b : "- " + Math.abs(b)}`,
            cue: `Grows by +${m} each step!`,
          },
        ],
        visualHint: `${m} × ${targetStep} ${b >= 0 ? "+ " + b : "- " + Math.abs(b)} = ${ans}`,
      };
    }

    case "expr_distribute": {
      const a = randInt(2, 5, rng);
      const b = pick([-4, -3, -2, 2, 3, 5], rng);
      const nVal = randInt(2, 7, rng);
      const ans = a * (nVal + b);
      const signB = b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`;
      const expanded = formatLinearExpr(a, a * b, "n");
      return {
        uid,
        nodeId,
        worldId: meta.worldId,
        strand: meta.strand,
        encounterType: "cryo_gate",
        title: meta.title,
        promptShort: `Power array when n = ${nVal}`,
        equationText: `${a}(n ${signB})  [n = ${nVal}]`,
        targetLabel: "Flux",
        answer: ans,
        startDial: 0,
        detents: [-10, -5, -1, 1, 5, 10],
        towers: { leftA: a, leftB: a * b, rightA: 0, rightB: ans },
        beamActions: [
          {
            id: "unpack_array",
            label: `Unpack → ${expanded}`,
            kind: "hint_transform",
            nextEquationText: `${expanded}  [n = ${nVal}]`,
            cue: `${a} rows of n and ${b}!`,
          },
        ],
        visualHint: `${a} × (${nVal} ${signB}) = ${ans}`,
      };
    }

    case "exp_power": {
      const pair = pick(
        [
          [2, 3],
          [2, 4],
          [2, 5],
          [3, 3],
          [3, 4],
          [4, 3],
          [5, 3],
        ],
        rng
      );
      const [base, exp] = pair;
      const ans = Math.pow(base, exp);
      return {
        uid,
        nodeId,
        worldId: meta.worldId,
        strand: meta.strand,
        encounterType: "aurora_cascade",
        title: meta.title,
        promptShort: "Ignite the crystal power tower",
        equationText: `${base}^${exp} = n`,
        targetLabel: "n",
        answer: ans,
        startDial: base * exp,
        detents: [-25, -5, -1, 1, 5, 25],
        beamActions: [
          {
            id: "expand_pow",
            label: `Expand ${exp} stages of ×${base}`,
            kind: "hint_transform",
            nextEquationText: `${Array(exp).fill(base).join(" × ")} = n`,
            cue: `Multiply by ${base}, ${exp} times!`,
          },
        ],
        visualHint: `${Array(exp).fill(base).join(" × ")} = ${ans}`,
      };
    }

    case "geo_parallel_angles": {
      const mode = pick(["alt", "supp"], rng);
      const given = randInt(42, 136, rng);
      const ans = mode === "alt" ? given : 180 - given;
      return {
        uid,
        nodeId,
        worldId: meta.worldId,
        strand: meta.strand,
        encounterType: "astrolabe_shrine",
        title: meta.title,
        promptShort: mode === "alt" ? "Lock Z-mirror beam angle" : "Complete 180° straight beam",
        equationText: mode === "alt" ? `Parallel Z-Angle: ${given}° → θ°` : `Straight Mirror Pair: ${given}° + θ° = 180°`,
        targetLabel: "θ°",
        answer: ans,
        startDial: 90,
        detents: [-25, -10, -1, 1, 10, 25],
        astrolabeMeta: { mode, given, target: ans },
        beamActions: [
          {
            id: "mirror_law",
            label: mode === "alt" ? "Slide angle along beam" : "180° - known angle",
            kind: "hint_transform",
            nextEquationText: mode === "alt" ? `Alternate interior: θ = ${given}°` : `θ = 180° - ${given}°`,
            cue: mode === "alt" ? "Parallel mirrors match!" : "Half-turn equals 180°!",
          },
        ],
        visualHint: mode === "alt" ? `Equal Z-angles: ${ans}°` : `180° - ${given}° = ${ans}°`,
      };
    }

    case "eq_twostep":
    case "eq_twostep_camo": {
      if (camo) {
        // Camouflaged form: c = b - a*n (protects Sarah from 6 - 2n -> 4n trap!)
        const a = randInt(2, 5, rng);
        const n = pick([-4, -3, -2, 2, 3, 4, 5, 6], rng);
        const b = randInt(6, 20, rng);
        const lhs = b - a * n;
        const eq = makeEquationEncounter({
          uid,
          nodeId,
          meta,
          promptShort: "Unlock camouflaged cryo-monolith",
          displayEq: `${lhs} = ${b} - ${a}n`,
          answer: n,
          left: { a: 0, b: lhs },
          right: { a: -a, b },
          detents: [-10, -5, -1, 1, 5, 10],
          startDial: 0,
          isCamouflage: true,
        });
        eq.beamActions.unshift({
          id: "repel_trap",
          label: `Merge ${b} - ${a}n → ${b - a}n?`,
          kind: "repel_trap",
          tag: "like_term_repulsion",
          cue: "Gold cubes & N-cores repel!",
        });
        return eq;
      }
      const a = randInt(2, 5, rng);
      const n = randInt(-5, 9, rng);
      const b = pick([-9, -6, -4, 3, 5, 7], rng);
      const rhs = a * n + b;
      return makeEquationEncounter({
        uid,
        nodeId,
        meta,
        promptShort: "Balance twin cryo-towers",
        displayEq: `${formatLinearExpr(a, b, "n")} = ${rhs}`,
        answer: n,
        left: { a, b },
        right: { a: 0, b: rhs },
        detents: [-10, -5, -1, 1, 5, 10],
        startDial: 0,
      });
    }

    case "eq_parens": {
      const a = randInt(2, 5, rng);
      const b = pick([-5, -4, -3, -2, 2, 3, 4], rng);
      const n = randInt(-3, 9, rng);
      const rhs = a * (n + b);
      const signB = b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`;
      const enc = makeEquationEncounter({
        uid,
        nodeId,
        meta,
        promptShort: "Unpack or mental-shatter gate",
        displayEq: `${a}(n ${signB}) = ${rhs}`,
        answer: n,
        left: { a, b: a * b, grouped: { factor: a, innerB: b } },
        right: { a: 0, b: rhs },
        detents: [-10, -5, -1, 1, 5, 10],
        startDial: 0,
      });
      enc.beamActions.unshift({
        id: "divide_outer",
        label: `Split both ÷${a}`,
        kind: "sym_step",
        nextLeft: { a: 1, b },
        nextRight: { a: 0, b: rhs / a },
        nextEquationText: `n ${signB} = ${rhs / a}`,
        cue: `Each group holds ${rhs / a}!`,
      });
      return enc;
    }

    case "eq_both_sides": {
      const n = randInt(-4, 8, rng);
      const rightA = randInt(1, 4, rng);
      const diffA = randInt(2, 4, rng);
      const leftA = rightA + diffA;
      const leftB = randInt(-8, 10, rng);
      const rightB = leftA * n + leftB - rightA * n;
      return makeEquationEncounter({
        uid,
        nodeId,
        meta,
        promptShort: "Clear N-cores across both towers",
        displayEq: `${formatLinearExpr(leftA, leftB, "n")} = ${formatLinearExpr(rightA, rightB, "n")}`,
        answer: n,
        left: { a: leftA, b: leftB },
        right: { a: rightA, b: rightB },
        detents: [-10, -5, -1, 1, 5, 10],
        startDial: 0,
      });
    }

    case "geo_scale_area": {
      const k = randInt(2, 5, rng);
      const baseArea = randInt(3, 10, rng);
      const ans = baseArea * k * k;
      return {
        uid,
        nodeId,
        worldId: meta.worldId,
        strand: meta.strand,
        encounterType: "astrolabe_shrine",
        title: meta.title,
        promptShort: `Scale ${k}×: new sail area?`,
        equationText: `Base Sail = ${baseArea} m² · Scale k = ${k}× → Area?`,
        targetLabel: "m²",
        answer: ans,
        startDial: baseArea * k,
        detents: [-25, -5, -1, 1, 5, 25],
        beamActions: [
          {
            id: "area_grid",
            label: `Tile ${k}×${k} area grid (×${k * k})`,
            kind: "hint_transform",
            nextEquationText: `Area scales by k² = ${k}² = ${k * k} → ${baseArea} × ${k * k}`,
            cue: `Width AND height scale ×${k}!`,
          },
        ],
        visualHint: `${baseArea} × ${k}² = ${ans} m²`,
      };
    }

    case "ramp_slope_only": {
      const run = pick([3, 4, 5, 6], rng);
      const m = pick([-2, -1, 1, 2, 3, 4], rng);
      const rise = m * run;
      return {
        uid,
        nodeId,
        worldId: meta.worldId,
        strand: meta.strand,
        encounterType: "holo_ramp",
        title: meta.title,
        promptShort: "Dial slope m (rise ÷ run)",
        equationText: `Run Δx = ${run}m · Ring Height Δy = ${rise}m → Slope m?`,
        targetLabel: "Slope m",
        answer: m,
        startDial: 0,
        detents: [-2, -1, 1, 2],
        rampMeta: { m, b: 0, targetX: run, targetY: rise, mode: "slope" },
        beamActions: [
          {
            id: "rise_run",
            label: `Compute ${rise} ÷ ${run}`,
            kind: "hint_transform",
            nextEquationText: `m = Δy / Δx = ${rise} / ${run}`,
            cue: "Rise divided by run!",
          },
        ],
        visualHint: `Slope m = ${rise} ÷ ${run} = ${m}`,
      };
    }

    case "ramp_linear":
    case "ramp_point_target": {
      const m = pick([-2, -1, 1, 2, 3], rng);
      const b = randInt(-3, 6, rng);
      const targetX = pick([4, 5, 6], rng);
      const targetY = m * targetX + b;
      // Player tunes slope m (with platform lift b shown physically on pad!) or tunes targetY/m
      const solveForB = meta.kind === "ramp_point_target";
      const ans = solveForB ? b : m;
      return {
        uid,
        nodeId,
        worldId: meta.worldId,
        strand: meta.strand,
        encounterType: "holo_ramp",
        title: meta.title,
        promptShort: solveForB ? "Dial lift b to hit ring" : "Dial slope m to hit ring",
        equationText: solveForB
          ? `y = ${m}x + b through (${targetX}, ${targetY}) → Lift b?`
          : `Pad Lift b = ${b} · Ring at (${targetX}, ${targetY}) → Slope m?`,
        targetLabel: solveForB ? "Lift b" : "Slope m",
        answer: ans,
        startDial: 0,
        detents: [-5, -1, 1, 5],
        rampMeta: { m, b, targetX, targetY, solveForB },
        beamActions: [
          {
            id: "ramp_offset",
            label: solveForB ? `Slope climbs ${m * targetX}m over ${targetX}m` : `Need Δy = ${targetY - b}m over ${targetX}m`,
            kind: "hint_transform",
            nextEquationText: solveForB
              ? `${targetY} = ${m * targetX} + b`
              : `m = (${targetY} - ${b}) ÷ ${targetX}`,
            cue: solveForB ? "Match ring height at x!" : "Climb from pad to ring!",
          },
        ],
        visualHint: `y = ${formatLinearExpr(m, b, "x")} hits (${targetX}, ${targetY})`,
      };
    }

    case "sys_intersection": {
      const xAns = randInt(1, 7, rng);
      const m1 = randInt(2, 5, rng);
      const m2 = randInt(1, m1 - 1, rng);
      const b1 = randInt(-4, 6, rng);
      const yMeet = m1 * xAns + b1;
      const b2 = yMeet - m2 * xAns;
      return makeEquationEncounter({
        uid,
        nodeId,
        meta,
        encounterOverride: "holo_ramp",
        promptShort: "Find x where twin rigs meet",
        displayEq: `${formatLinearExpr(m1, b1, "x")} = ${formatLinearExpr(m2, b2, "x")}`,
        answer: xAns,
        left: { a: m1, b: b1 },
        right: { a: m2, b: b2 },
        varSymbol: "x",
        detents: [-5, -1, 1, 5],
        startDial: 0,
        rampMeta: { m: m1, b: b1, m2, b2, targetX: xAns, targetY: yMeet, isSystem: true },
      });
    }

    case "geo_triangle_truss": {
      const a1 = randInt(35, 80, rng);
      const a2 = randInt(35, 75, rng);
      const ans = 180 - a1 - a2;
      return {
        uid,
        nodeId,
        worldId: meta.worldId,
        strand: meta.strand,
        encounterType: "astrolabe_shrine",
        title: meta.title,
        promptShort: "Lock rigid crystal truss (180°)",
        equationText: `Triangle Truss: ${a1}° + ${a2}° + θ° = 180°`,
        targetLabel: "θ°",
        answer: ans,
        startDial: 60,
        detents: [-25, -10, -1, 1, 10, 25],
        astrolabeMeta: { mode: "truss", a1, a2, target: ans },
        beamActions: [
          {
            id: "sum_two",
            label: `Combine ${a1}° + ${a2}° = ${a1 + a2}°`,
            kind: "hint_transform",
            nextEquationText: `${a1 + a2}° + θ° = 180°`,
            cue: "Three corners lock at 180°!",
          },
        ],
        visualHint: `180° - ${a1 + a2}° = ${ans}°`,
      };
    }

    case "geo_astrolabe_thales": {
      // Inscribed angle on diameter = 90°, so acute star-ring partner = 90 - alpha!
      const alpha = randInt(22, 68, rng);
      const ans = 90 - alpha;
      return {
        uid,
        nodeId,
        worldId: meta.worldId,
        strand: meta.strand,
        encounterType: "astrolabe_shrine",
        title: meta.title,
        promptShort: "Align Sky-Astrolabe semicircle",
        equationText: `Diameter Arc (90° Peak) · α = ${alpha}° → β°?`,
        targetLabel: "β°",
        answer: ans,
        startDial: 45,
        detents: [-10, -5, -1, 1, 5, 10],
        astrolabeMeta: { mode: "thales", alpha, target: ans },
        beamActions: [
          {
            id: "thales_law",
            label: "Diameter inscribes 90° corner!",
            kind: "hint_transform",
            nextEquationText: `90° + ${alpha}° + β° = 180° → β = 90° - ${alpha}°`,
            cue: "Semicircle locks a 90° peak!",
          },
        ],
        visualHint: `Thales' Ring: 90° - ${alpha}° = ${ans}°`,
      };
    }

    case "geo_pythagoras": {
      const triple = pick(
        [
          [3, 4, 5],
          [6, 8, 10],
          [5, 12, 13],
          [9, 12, 15],
          [8, 15, 17],
        ],
        rng
      );
      const [legA, legB, hyp] = triple;
      return {
        uid,
        nodeId,
        worldId: meta.worldId,
        strand: meta.strand,
        encounterType: "harpoon_cliff",
        title: meta.title,
        promptShort: "Tension cliff harpoon cable c",
        equationText: `Base ${legA}m · Cliff ${legB}m → Cable c?`,
        targetLabel: "Cable m",
        answer: hyp,
        startDial: legB,
        detents: [-5, -1, 1, 5],
        harpoonMeta: { legA, legB, hyp },
        beamActions: [
          {
            id: "pythag_squares",
            label: `Squares: ${legA * legA} + ${legB * legB} = ${hyp * hyp}`,
            kind: "hint_transform",
            nextEquationText: `c² = ${hyp * hyp} → √${hyp * hyp}`,
            cue: "a² + b² builds cable square c²!",
          },
        ],
        visualHint: `√(${legA}² + ${legB}²) = ${hyp}m`,
      };
    }

    case "geo_trig_ratio": {
      const spec = pick(
        [
          { angle: 30, fn: "sin", ratioLabel: "sin 30° = 0.5", hyp: 20, ans: 10, prompt: "Cliff height: hyp × sin 30°" },
          { angle: 30, fn: "sin", ratioLabel: "sin 30° = 0.5", hyp: 36, ans: 18, prompt: "Cliff height: hyp × sin 30°" },
          { angle: 45, fn: "tan", ratioLabel: "tan 45° = 1", adj: 14, ans: 14, prompt: "45° beam: height matches base" },
          { angle: 60, fn: "cos", ratioLabel: "cos 60° = 0.5", hyp: 24, ans: 12, prompt: "Base span: hyp × cos 60°" },
        ],
        rng
      );
      const span = spec.hyp || spec.adj;
      return {
        uid,
        nodeId,
        worldId: meta.worldId,
        strand: meta.strand,
        encounterType: "harpoon_cliff",
        title: meta.title,
        promptShort: spec.prompt,
        equationText: `Angle ${spec.angle}° (${spec.ratioLabel}) · Span ${span}m → Target?`,
        targetLabel: "Meters",
        answer: spec.ans,
        startDial: 10,
        detents: [-10, -5, -1, 1, 5, 10],
        harpoonMeta: { legA: spec.ans, legB: spec.ans, hyp: span },
        beamActions: [
          {
            id: "trig_key",
            label: `Apply ${spec.ratioLabel}`,
            kind: "hint_transform",
            nextEquationText: `${span} × ${spec.fn === "tan" ? "1" : "0.5"} = ?`,
            cue: `${spec.ratioLabel} scales the triangle!`,
          },
        ],
        visualHint: `${spec.ratioLabel} gives ${spec.ans}m`,
      };
    }

    case "arch_vertex_eval": {
      const h = randInt(2, 5, rng);
      const k = randInt(8, 18, rng);
      const a = pick([-1, -2], rng);
      const askPeak = rng() < 0.5;
      const xProbe = h + 2;
      const yProbe = a * 4 + k;
      return {
        uid,
        nodeId,
        worldId: meta.worldId,
        strand: meta.strand,
        encounterType: "rainbow_arch",
        title: meta.title,
        promptShort: askPeak ? "Dial rainbow arch peak height k" : `Arch height at x = ${xProbe}`,
        equationText: askPeak
          ? `Arch y = ${a === -1 ? "-" : a}(x - ${h})² + ${k} → Peak Height?`
          : `Arch y = ${a === -1 ? "-" : a}(x - ${h})² + ${k} at x = ${xProbe}`,
        targetLabel: "Height y",
        answer: askPeak ? k : yProbe,
        startDial: 0,
        detents: [-5, -1, 1, 5],
        archMeta: { a, h, k, r1: h - 3, r2: h + 3 },
        beamActions: [
          {
            id: "vertex_spot",
            label: askPeak ? `At x = ${h}, square term = 0` : `(${xProbe} - ${h})² = 4`,
            kind: "hint_transform",
            nextEquationText: askPeak ? `Peak sits right at (${h}, ${k})` : `y = ${a}(4) + ${k}`,
            cue: "Vertex (h, k) crowns the arch!",
          },
        ],
        visualHint: askPeak ? `Peak height k = ${k}` : `${a}×4 + ${k} = ${yProbe}`,
      };
    }

    case "arch_roots": {
      const r1 = randInt(1, 3, rng);
      const span = pick([4, 6, 8], rng);
      const r2 = r1 + span;
      const mid = (r1 + r2) / 2;
      const askLanding = rng() < 0.5;
      return {
        uid,
        nodeId,
        worldId: meta.worldId,
        strand: meta.strand,
        encounterType: "rainbow_arch",
        title: meta.title,
        promptShort: askLanding ? "Find far landing pad x-root" : "Find arch symmetry midpoint x",
        equationText: `Bridge y = -(x - ${r1})(x - ${r2})`,
        targetLabel: "x",
        answer: askLanding ? r2 : mid,
        startDial: r1,
        detents: [-5, -1, 1, 5],
        archMeta: { a: -0.5, h: mid, k: (span * span) / 8, r1, r2 },
        beamActions: [
          {
            id: "zero_pads",
            label: `Roots touch ground at ${r1} & ${r2}`,
            kind: "hint_transform",
            nextEquationText: askLanding ? `Far pad where (x - ${r2}) = 0` : `Midpoint = (${r1} + ${r2}) ÷ 2`,
            cue: "Arch lands where factor = 0!",
          },
        ],
        visualHint: askLanding ? `Lands at x = ${r2}` : `Peak centered at x = ${mid}`,
      };
    }

    case "quad_complete_sq": {
      const half = randInt(2, 7, rng);
      const bCoeff = 2 * half;
      const ans = half * half;
      return {
        uid,
        nodeId,
        worldId: meta.worldId,
        strand: meta.strand,
        encounterType: "cryo_gate",
        title: meta.title,
        promptShort: "Fill corner slab to complete square",
        equationText: `x² + ${bCoeff}x + [?] = (x + ${half})²`,
        targetLabel: "Corner",
        answer: ans,
        startDial: bCoeff,
        detents: [-10, -5, -1, 1, 5, 10],
        towers: { leftA: 1, leftB: bCoeff, rightA: 0, rightB: ans },
        beamActions: [
          {
            id: "split_wings",
            label: `Split ${bCoeff}x into two ${half}x wings`,
            kind: "hint_transform",
            nextEquationText: `Corner tile = ${half} × ${half}`,
            cue: `${half} by ${half} seals the square!`,
          },
        ],
        visualHint: `(${bCoeff} ÷ 2)² = ${half}² = ${ans}`,
      };
    }

    case "exp_growth": {
      const a0 = pick([2, 3, 5], rng);
      const ratio = pick([2, 3], rng);
      const x = randInt(3, 4, rng);
      const ans = a0 * Math.pow(ratio, x);
      return {
        uid,
        nodeId,
        worldId: meta.worldId,
        strand: meta.strand,
        encounterType: "aurora_cascade",
        title: meta.title,
        promptShort: `Cascade ×${ratio} for ${x} stages`,
        equationText: `y = ${a0} · (${ratio}^${x})`,
        targetLabel: "Output",
        answer: ans,
        startDial: a0,
        detents: [-25, -5, -1, 1, 5, 25],
        beamActions: [
          {
            id: "step_mult",
            label: `Multiplier ${ratio}^${x} = ${Math.pow(ratio, x)}`,
            kind: "hint_transform",
            nextEquationText: `y = ${a0} × ${Math.pow(ratio, x)}`,
            cue: `Start at ${a0}, multiply ×${ratio}!`,
          },
        ],
        visualHint: `${a0} × ${Math.pow(ratio, x)} = ${ans}`,
      };
    }

    case "log_stage": {
      const base = pick([2, 3, 10], rng);
      const stage = base === 10 ? randInt(2, 4, rng) : randInt(3, 5, rng);
      const target = Math.pow(base, stage);
      return {
        uid,
        nodeId,
        worldId: meta.worldId,
        strand: meta.strand,
        encounterType: "aurora_cascade",
        title: meta.title,
        promptShort: `How many ×${base} stages reach ${target}?`,
        equationText: `log_${base}(${target}) = stages  [${base}^n = ${target}]`,
        targetLabel: "Stages",
        answer: stage,
        startDial: 1,
        detents: [-1, 1],
        beamActions: [
          {
            id: "count_chain",
            label: `Step powers of ${base}`,
            kind: "hint_transform",
            nextEquationText: Array.from({ length: stage }, (_, i) => Math.pow(base, i + 1)).join(" → "),
            cue: "Logs count the multiplier steps!",
          },
        ],
        visualHint: `${base}^${stage} = ${target} (${stage} stages)`,
      };
    }

    case "trig_wave_crest":
    default: {
      const amp = randInt(3, 9, rng);
      const mid = randInt(2, 10, rng);
      const ans = mid + amp;
      return {
        uid,
        nodeId,
        worldId: meta.worldId,
        strand: meta.strand,
        encounterType: "rainbow_arch",
        title: meta.title,
        promptShort: "Dial wave crest (midline + amp)",
        equationText: `Wave y = ${amp}·sin(x) + ${mid} → Max Crest?`,
        targetLabel: "Crest y",
        answer: ans,
        startDial: mid,
        detents: [-5, -1, 1, 5],
        archMeta: { a: -0.4, h: 4, k: ans, r1: 1, r2: 7, isWave: true },
        beamActions: [
          {
            id: "wave_peak",
            label: `Peak sin(x) = 1 → ${amp}(1) + ${mid}`,
            kind: "hint_transform",
            nextEquationText: `Crest = ${mid} + ${amp}`,
            cue: "Crest rises amplitude above midline!",
          },
        ],
        visualHint: `Midline ${mid} + Amplitude ${amp} = ${ans}`,
      };
    }
  }
}

function buildBeamActionsForLinear(left, right, varSymbol = "n") {
  const actions = [];
  if (left.grouped) {
    const { factor, innerB } = left.grouped;
    actions.push({
      id: "unpack_group",
      label: `Unpack ${factor}(...)`,
      kind: "sym_step",
      nextLeft: { a: factor, b: factor * innerB },
      nextRight: { ...right },
      nextEquationText: `${formatLinearExpr(factor, factor * innerB, varSymbol)} = ${formatLinearExpr(right.a, right.b, varSymbol)}`,
      cue: "Prism unpacked across blocks!",
    });
    return actions;
  }

  if (left.a !== 0 && right.a !== 0) {
    const zapA = Math.abs(left.a) <= Math.abs(right.a) ? left.a : right.a;
    const nl = { a: left.a - zapA, b: left.b };
    const nr = { a: right.a - zapA, b: right.b };
    const verb = zapA > 0 ? `Zap -${zapA === 1 ? "" : zapA}${varSymbol} both` : `Add +${Math.abs(zapA) === 1 ? "" : Math.abs(zapA)}${varSymbol} both`;
    actions.push({
      id: "zap_var",
      label: verb,
      kind: "sym_step",
      nextLeft: nl,
      nextRight: nr,
      nextEquationText: `${formatLinearExpr(nl.a, nl.b, varSymbol)} = ${formatLinearExpr(nr.a, nr.b, varSymbol)}`,
      cue: "Twin beam cleared matching cores!",
    });
  }

  const varSide = left.a !== 0 ? left : right;
  if (varSide.b !== 0 && (left.a === 0 || right.a === 0)) {
    const k = varSide.b;
    const nl = { a: left.a, b: left.b - k };
    const nr = { a: right.a, b: right.b - k };
    const verb = k > 0 ? `Zap -${k} both` : `Add +${Math.abs(k)} both`;
    actions.push({
      id: "zap_const",
      label: verb,
      kind: "sym_step",
      nextLeft: nl,
      nextRight: nr,
      nextEquationText: `${formatLinearExpr(nl.a, nl.b, varSymbol)} = ${formatLinearExpr(nr.a, nr.b, varSymbol)}`,
      cue: "Symmetric beam balanced both sides!",
    });
  }

  if ((left.a === 0 || right.a === 0) && varSide.b === 0 && varSide.a !== 1 && varSide.a !== 0) {
    const div = varSide.a;
    const nl = { a: left.a / div, b: left.b / div };
    const nr = { a: right.a / div, b: right.b / div };
    actions.push({
      id: "split_coeff",
      label: `Split both ÷(${div})`,
      kind: "sym_step",
      nextLeft: nl,
      nextRight: nr,
      nextEquationText: `${formatLinearExpr(nl.a, nl.b, varSymbol)} = ${formatLinearExpr(nr.a, nr.b, varSymbol)}`,
      cue: div < 0 ? "Negative split flipped polarity!" : `Divided cleanly into ${div} tracks!`,
    });
  }

  return actions;
}

function makeEquationEncounter({
  uid,
  nodeId,
  meta,
  promptShort,
  displayEq,
  answer,
  left,
  right,
  detents,
  startDial = 0,
  varSymbol = "n",
  isCamouflage = false,
  encounterOverride = null,
}) {
  return {
    uid,
    nodeId,
    worldId: meta.worldId,
    strand: meta.strand,
    encounterType: encounterOverride || "cryo_gate",
    title: meta.title,
    promptShort,
    equationText: displayEq,
    targetLabel: varSymbol,
    varSymbol,
    answer,
    startDial,
    detents,
    isCamouflage,
    left: { ...left },
    right: { ...right },
    towers: {
      leftA: left.a,
      leftB: left.b,
      rightA: right.a,
      rightB: right.b,
    },
    blueprintLog: [displayEq],
    beamActions: buildBeamActionsForLinear(left, right, varSymbol),
    stepsUsed: 0,
    missesOnItem: 0,
    visualHint: `${varSymbol} = ${answer} balances both towers`,
  };
}

/**
 * Applies a voluntary Twin-Beam symmetric transformation to an active encounter.
 * Never penalizes; repel_trap teaches like-term physics with zero shame!
 */
export function applyBeamAction(encounter, actionId, progress) {
  const act = (encounter.beamActions || []).find((a) => a.id === actionId);
  if (!act) return { kind: "noop", encounter };

  if (act.kind === "repel_trap") {
    if (progress && act.tag) {
      progress.misconceptionTags[act.tag] = (progress.misconceptionTags[act.tag] || 0) + 1;
    }
    return {
      kind: "magnetic_repel",
      cue: act.cue || "Gold cubes & N-cores repel!",
      encounter: {
        ...encounter,
        beamActions: encounter.beamActions.filter((a) => a.id !== actionId),
      },
    };
  }

  if (act.kind === "sym_step") {
    const nextBeamActions = buildBeamActionsForLinear(act.nextLeft, act.nextRight, encounter.varSymbol || "n");
    const updated = {
      ...encounter,
      left: { ...act.nextLeft },
      right: { ...act.nextRight },
      towers: {
        leftA: act.nextLeft.a,
        leftB: act.nextLeft.b,
        rightA: act.nextRight.a,
        rightB: act.nextRight.b,
      },
      equationText: act.nextEquationText,
      blueprintLog: [...(encounter.blueprintLog || [encounter.equationText]), act.nextEquationText],
      beamActions: nextBeamActions,
      stepsUsed: (encounter.stepsUsed || 0) + 1,
    };
    return { kind: "transformed", cue: act.cue, encounter: updated };
  }

  const updated = {
    ...encounter,
    equationText: act.nextEquationText || encounter.equationText,
    blueprintLog: [...(encounter.blueprintLog || [encounter.equationText]), act.nextEquationText || encounter.equationText],
    beamActions: encounter.beamActions.filter((a) => a.id !== actionId),
    stepsUsed: (encounter.stepsUsed || 0) + 1,
  };
  return { kind: "transformed", cue: act.cue, encounter: updated };
}

/**
 * Evaluates a physical commit (Ramming Cryo-Gate, Launching Holo-Ramp, Firing Harpoon).
 * Enforces:
 * - 1-Shot Mental Overdrive bonus (eta >= 1.25 -> 1.5x shards)
 * - Deterministic 3D physics delta on miss (never red X or shame words)
 * - 2-miss warm Fox reveal + 100% shard payout + session shelve
 * - Dynamic Friction Cushion (F_t >= 2.8 -> 4-item Overdrive Surge Wave!)
 */
export function evaluateCommit({
  encounter,
  committedValue,
  planMs = 2200,
  execMs = 800,
  progress,
  session,
  rng = Math.random,
}) {
  const numVal = Number(committedValue);
  const target = Number(encounter.answer);
  const delta = numVal - target;
  const hit = Number.isFinite(numVal) && Math.abs(delta) < 1e-6;
  const node = progress.nodes[encounter.nodeId] || {
    pKnow: 0.25,
    stage: 0,
    attempts: 0,
    wins: 0,
    overdrives: 0,
    camouflageCleared: false,
    avgPlanMs: 0,
    avgExecMs: 0,
  };
  progress.nodes[encounter.nodeId] = node;
  node.attempts += 1;
  node.lastSeenAt = Date.now();
  node.avgPlanMs = node.avgPlanMs ? Math.round(0.7 * node.avgPlanMs + 0.3 * planMs) : Math.round(planMs);
  node.avgExecMs = node.avgExecMs ? Math.round(0.7 * node.avgExecMs + 0.3 * execMs) : Math.round(execMs);

  const hesitated = planMs > 16000;

  if (hit) {
    const overdrive = (encounter.stepsUsed || 0) === 0;
    const baseShards = session.inSurge ? 18 : 14;
    const shardsEarned = overdrive ? Math.round(baseShards * 1.5) : baseShards;

    node.wins += 1;
    if (overdrive) node.overdrives += 1;
    if (encounter.isCamouflage) node.camouflageCleared = true;

    // Bayesian Knowledge Tracing + Path Efficiency boost
    const pSlip = 0.08;
    const pGuess = 0.06;
    const pLearn = overdrive ? 0.28 : 0.21;
    const prior = node.pKnow;
    const post = (prior * (1 - pSlip)) / (prior * (1 - pSlip) + (1 - prior) * pGuess);
    node.pKnow = Math.min(0.99, post + (1 - post) * pLearn);
    updateNodeStage(node);

    progress.fluxShards += shardsEarned;
    progress.unsyncedFlux = (progress.unsyncedFlux || 0) + shardsEarned;
    progress.totalSolved += 1;
    progress.records.foxesWoken = (progress.records.foxesWoken || 0) + 1;

    if (target <= -100 && Math.abs(target) > (progress.records.deepestSubZero || 0)) {
      progress.records.deepestSubZero = Math.abs(target);
      unlockMystery(progress, "subzero_abyss");
    }
    if (encounter.encounterType === "holo_ramp" || encounter.encounterType === "rainbow_arch") {
      const spanM = Math.max(24, Math.abs(target) * 6 + 28);
      if (spanM > (progress.records.longestRampM || 0)) progress.records.longestRampM = spanM;
      unlockMystery(progress, "rainbow_surfer");
    }
    if (encounter.encounterType === "astrolabe_shrine") {
      unlockMystery(progress, "astrolabe_lock");
    }

    session.consecutiveMisses = 0;
    session.consecutiveWins += 1;
    session.overdriveStreak = overdrive ? session.overdriveStreak + 1 : 0;
    if (session.overdriveStreak > (progress.records.bestOverdriveStreak || 0)) {
      progress.records.bestOverdriveStreak = session.overdriveStreak;
    }
    if (session.overdriveStreak >= 3) {
      unlockMystery(progress, "aurora_whale");
    }

    session.friction = Math.max(0, 0.68 * session.friction - 0.55);

    // Handle calibration progression if in W0
    let calibrationFinished = false;
    if (!progress.calibrated && encounter.worldId === "W0") {
      calibrationFinished = recordCalibrationStep(progress, encounter.nodeId, true);
    }

    // Unlock adjacent world when >=2 nodes reach stage >= 2
    unlockFrontierWorlds(progress);

    // Organic 15% Overdrive Surge on 5-win streaks so Surge never stigmatizes!
    let surgeTriggered = false;
    if (!session.inSurge && session.consecutiveWins >= 5 && rng() < 0.15) {
      queueOverdriveSurge(progress, session, encounter.nodeId);
      surgeTriggered = true;
    }

    progress.rev = Date.now();
    return {
      outcome: "clear",
      overdrive,
      shardsEarned,
      delta: 0,
      cue: overdrive ? "OVERDRIVE SHATTER! 1.5×" : "Balanced! Gate open!",
      calibrationFinished,
      surgeTriggered,
    };
  }

  // Miss path: deterministic physical feedback, never punitive!
  const missesNow = (encounter.missesOnItem || 0) + 1;
  encounter.missesOnItem = missesNow;
  session.consecutiveWins = 0;
  session.overdriveStreak = 0;
  session.consecutiveMisses += 1;
  session.friction = 0.68 * session.friction + (1 + 0.5 * session.consecutiveMisses) + (hesitated ? 0.35 : 0);

  if (numVal === -target && target !== 0) {
    progress.misconceptionTags.sign_flip = (progress.misconceptionTags.sign_flip || 0) + 1;
  }

  // Gentle BKT update (bounded floor so confidence never craters)
  node.pKnow = Math.max(0.12, node.pKnow * 0.88);
  updateNodeStage(node);

  // 2nd miss on same obstacle -> Warm Arctic Fox 3D Reveal + full shards + shelve!
  if (missesNow >= 2) {
    const warmShards = 14;
    progress.fluxShards += warmShards;
    progress.unsyncedFlux = (progress.unsyncedFlux || 0) + warmShards;
    if (!session.shelvedIds.includes(encounter.nodeId)) {
      session.shelvedIds.push(encounter.nodeId);
      session.shelvedLog.push({
        nodeId: encounter.nodeId,
        title: encounter.title,
        eq: encounter.equationText,
        answer: target,
      });
    }

    let calibrationFinished = false;
    if (!progress.calibrated && encounter.worldId === "W0") {
      calibrationFinished = recordCalibrationStep(progress, encounter.nodeId, false);
    }

    let surgeTriggered = false;
    if (
      encounter.worldId !== "W0" &&
      session.consecutiveMisses >= 3 &&
      session.friction >= 2.8 &&
      !session.inSurge
    ) {
      queueOverdriveSurge(progress, session, encounter.nodeId);
      surgeTriggered = true;
    }

    progress.rev = Date.now();
    return {
      outcome: "warm_reveal",
      overdrive: false,
      shardsEarned: warmShards,
      answer: target,
      delta,
      cue: `Fox guide: ${encounter.targetLabel} = ${target}`,
      visualHint: encounter.visualHint,
      calibrationFinished,
      surgeTriggered,
    };
  }

  // 1st miss -> physical 3D caliper cue (<= 6 words!)
  let deltaCue = delta > 0 ? `${Math.abs(delta)} too high` : `${Math.abs(delta)} too low`;
  if (numVal === -target && target !== 0) {
    deltaCue = "Flip polarity sign!";
  }

  return {
    outcome: "nudge",
    overdrive: false,
    shardsEarned: 0,
    delta,
    cue: deltaCue,
  };
}

function updateNodeStage(node) {
  if (node.pKnow >= 0.9 && node.wins >= 2) node.stage = Math.max(node.stage, 3);
  else if (node.pKnow >= 0.72) node.stage = Math.max(node.stage, 2);
  else if (node.pKnow >= 0.45 || node.wins >= 1) node.stage = Math.max(node.stage, 1);
}

function recordCalibrationStep(progress, nodeId, cleanHit) {
  progress.calibrationHits = progress.calibrationHits || [];
  progress.calibrationHits.push({ nodeId, cleanHit });
  progress.calibrationStep = progress.calibrationHits.length;

  if (progress.calibrationStep < 6) return false;

  progress.calibrated = true;
  const hitSet = new Set(progress.calibrationHits.filter((h) => h.cleanHit).map((h) => h.nodeId));

  if (hitSet.has("W0.5") && hitSet.has("W0.6")) {
    // Sarah / Algebra 1 Honors ready!
    progress.activeWorld = "W2";
    ensureUnlocked(progress, ["W1", "W2", "W3", "W4"]);
  } else if (hitSet.has("W0.3") || hitSet.has("W0.4")) {
    progress.activeWorld = "W2";
    ensureUnlocked(progress, ["W1", "W2", "W3"]);
  } else {
    // David / Sub-Zero Beast Academy frontier!
    progress.activeWorld = "W1";
    ensureUnlocked(progress, ["W1", "W2"]);
  }
  return true;
}

function ensureUnlocked(progress, worldIds) {
  for (const id of worldIds) {
    if (!progress.unlockedWorlds.includes(id)) progress.unlockedWorlds.push(id);
  }
}

export function unlockFrontierWorlds(progress) {
  for (let i = 1; i < WORLDS.length - 1; i++) {
    const w = WORLDS[i];
    if (!progress.unlockedWorlds.includes(w.id)) continue;
    const solidCount = w.nodes.filter((n) => (progress.nodes[n.id]?.stage || 0) >= 2).length;
    if (solidCount >= 2) {
      const nextW = WORLDS[i + 1];
      if (nextW && !progress.unlockedWorlds.includes(nextW.id)) {
        progress.unlockedWorlds.push(nextW.id);
      }
    }
  }
}

export function unlockMystery(progress, mysteryId) {
  if (!progress.discoveredMysteries.includes(mysteryId)) {
    progress.discoveredMysteries.push(mysteryId);
    return true;
  }
  return false;
}

/**
 * Builds the 4-Item Golden Thaw / Overdrive Surge Wave:
 * 2 effortless mastered/easy favorites + 1 gentle structural bridge + 1 triumphant closer!
 */
export function queueOverdriveSurge(progress, session, struggledNodeId) {
  const masteredPool = Object.entries(progress.nodes)
    .filter(([id, st]) => !id.startsWith("W0") && st.stage >= 2 && id !== struggledNodeId)
    .map(([id]) => id);

  const easyPool = masteredPool.length >= 2 ? masteredPool : ["W1.1", "W1.2", "W2.1"];
  const fav1 = easyPool[0];
  const fav2 = easyPool[1 % easyPool.length];
  const bridge = !progress.calibrated ? "W1.1" : "W1.3";
  const closer = masteredPool[2] || "W2.1";

  session.surgeQueue = [fav1, fav2, bridge, closer];
  session.inSurge = true;
  session.friction = 1.0;
}

/**
 * Selects the next adaptive encounter for the active world (or Calibration / Surge Wave).
 */
export function pickNextEncounter(progress, session, preferredWorldId = null, rng = Math.random) {
  if (session.surgeQueue && session.surgeQueue.length > 0) {
    const nextId = session.surgeQueue.shift();
    if (session.surgeQueue.length === 0) {
      // Keep inSurge true for this final closer item; cleared after next pick
      setTimeout(() => {
        session.inSurge = false;
      }, 0);
    }
    return generateEncounter(nextId, { rng, camouflage: false });
  }
  session.inSurge = false;

  if (!progress.calibrated && (!preferredWorldId || preferredWorldId === "W0")) {
    const stepIdx = Math.min(progress.calibrationStep || 0, WORLDS[0].nodes.length - 1);
    const calNode = WORLDS[0].nodes[stepIdx];
    return generateEncounter(calNode.id, { rng });
  }

  const worldId = preferredWorldId && preferredWorldId !== "W0" ? preferredWorldId : progress.activeWorld === "W0" ? "W1" : progress.activeWorld;
  const world = WORLDS.find((w) => w.id === worldId) || WORLDS[1];

  const candidates = world.nodes.filter((n) => !session.shelvedIds.includes(n.id));
  const pool = candidates.length > 0 ? candidates : world.nodes;

  // Weight toward Consolidating/Structuring frontier without repeating exact same node 3x
  let chosen = pool[0];
  let bestScore = -999;
  for (const n of pool) {
    const st = progress.nodes[n.id] || { pKnow: 0.2, stage: 0 };
    const sweetSpot = 1 - Math.abs(0.62 - st.pKnow);
    const recencyPenalty = session.recentNodeIds.slice(-2).includes(n.id) ? 0.35 : 0;
    const score = sweetSpot - recencyPenalty + rng() * 0.25;
    if (score > bestScore) {
      bestScore = score;
      chosen = n;
    }
  }

  session.recentNodeIds.push(chosen.id);
  if (session.recentNodeIds.length > 8) session.recentNodeIds.shift();

  const nodeState = progress.nodes[chosen.id];
  const useCamo = Boolean(nodeState && nodeState.stage >= 2 && !nodeState.camouflageCleared);
  return generateEncounter(chosen.id, { rng, camouflage: useCamo });
}

/**
 * Computes an orthogonal, non-ranked Hero Title celebrating each sibling's unique style!
 */
export function computeHeroTitle(progress) {
  const r = progress.records || {};
  if ((r.bestOverdriveStreak || 0) >= 4) return "Mental Overdrive Ace";
  if ((r.deepestSubZero || 0) >= 100) return "Sub-Zero Architect";
  if ((progress.discoveredMysteries || []).includes("astrolabe_lock")) return "Astrolabe Navigator";
  if ((r.longestRampM || 0) >= 40) return "Holo-Ramp Trailblazer";
  if ((progress.snowClearedM2 || 0) >= 250) return "Glacier Terra-Captain";
  return "Frostwake Pioneer";
}

/**
 * Monotonically merges two progress blobs across devices so offline play never loses shards or mastery.
 */
export function mergeProgress(a, b) {
  if (!a) return b;
  if (!b) return a;
  const newer = (b.rev || 0) >= (a.rev || 0) ? b : a;
  const older = newer === b ? a : b;
  const mergedNodes = {};
  for (const id of Object.keys(NODE_MAP)) {
    const na = a.nodes?.[id] || {};
    const nb = b.nodes?.[id] || {};
    mergedNodes[id] = {
      pKnow: Math.max(na.pKnow || 0.15, nb.pKnow || 0.15),
      stage: Math.max(na.stage || 0, nb.stage || 0),
      attempts: Math.max(na.attempts || 0, nb.attempts || 0),
      wins: Math.max(na.wins || 0, nb.wins || 0),
      overdrives: Math.max(na.overdrives || 0, nb.overdrives || 0),
      camouflageCleared: Boolean(na.camouflageCleared || nb.camouflageCleared),
      avgPlanMs: nb.avgPlanMs || na.avgPlanMs || 0,
      avgExecMs: nb.avgExecMs || na.avgExecMs || 0,
      lastSeenAt: Math.max(na.lastSeenAt || 0, nb.lastSeenAt || 0),
    };
  }
  return {
    ...older,
    ...newer,
    calibrated: Boolean(a.calibrated || b.calibrated),
    unlockedWorlds: Array.from(new Set([...(a.unlockedWorlds || []), ...(b.unlockedWorlds || [])])),
    fluxShards: Math.max(a.fluxShards || 0, b.fluxShards || 0),
    totalSolved: Math.max(a.totalSolved || 0, b.totalSolved || 0),
    snowClearedM2: Math.max(a.snowClearedM2 || 0, b.snowClearedM2 || 0),
    ownedUpgrades: Array.from(new Set([...(a.ownedUpgrades || []), ...(b.ownedUpgrades || [])])),
    discoveredMysteries: Array.from(new Set([...(a.discoveredMysteries || []), ...(b.discoveredMysteries || [])])),
    records: {
      bestOverdriveStreak: Math.max(a.records?.bestOverdriveStreak || 0, b.records?.bestOverdriveStreak || 0),
      longestRampM: Math.max(a.records?.longestRampM || 0, b.records?.longestRampM || 0),
      deepestSubZero: Math.max(a.records?.deepestSubZero || 0, b.records?.deepestSubZero || 0),
      foxesWoken: Math.max(a.records?.foxesWoken || 0, b.records?.foxesWoken || 0),
    },
    nodes: mergedNodes,
  };
}
