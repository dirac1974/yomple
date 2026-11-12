/**
 * @bloom-n/core — Pure Adaptive Adventure, Stealth-Teaching & Anxiety-Safety Engine
 * Zero DOM dependencies. Runs identically in browser ES modules, Node QA suites,
 * and future roblox-ts / Luau ports.
 */

export const ENGINE_VERSION = 2;

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

export const BANNED_CHILD_CURRICULUM_WORDS = [
  "pre-algebra",
  "pre-alg",
  "algebra 1",
  "algebra 2",
  "algebra i",
  "algebra ii",
  "geometry",
  "trigonometry",
  "trig",
  "curriculum",
  "grade 6",
  "worksheet",
  "standardized",
];

export const SUB_GAMES = [
  {
    id: "frostwake",
    order: 1,
    title: "Frostwake: Flux Terra-Rigs",
    subtitle: "3D Snow-Plow & Aurora Hover-Sled Valley",
    status: "live",
    badge: "REALM 1 · PLAY NOW · 3D LIVE",
    banner: "assets/realm1-frostwake.jpg",
    accent: "#38d9c0",
    blurb: "Carve deep snow trails, ram creeping rime-slimes, shatter cryo-gates, and surf 3D holo-ramps.",
  },
  {
    id: "oddroot",
    order: 2,
    title: "Oddroot Wilds: Alchemy Sanctuary",
    subtitle: "3D Bioluminescent Elixir & Creature Sanctuary",
    status: "live",
    badge: "REALM 2 · PLAY NOW · 3D LIVE",
    banner: "assets/realm2-oddroot.jpg",
    accent: "#7ee081",
    blurb: "Charge your Bramble-Boar, brew zero-pair elixirs, push back creeping blight, and hatch spirit creatures.",
  },
  {
    id: "stardrift",
    order: 3,
    title: "Stardrift Isles & Titan Astrolabes",
    subtitle: "3D Sky-Ship Archipelagos & Brass Star-Rings",
    status: "astrolabe_linked",
    badge: "REALM 3 · SKY-ASTROLABES ACTIVE IN RANK V",
    banner: "assets/realm3-stardrift.jpg",
    accent: "#f5c451",
    blurb: "Align giant brass astrolabes and glide across glowing parabolic sky-bridges.",
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
    blurb: "Freeze beast raids in 0.08x bullet-time and dial glowing parabolic arc shields.",
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

export const ODDROOT_MOUNTS = [
  {
    id: "bramble_boar",
    aliases: ["boar"],
    name: "Bramble-Plow Boar",
    tag: "Heavy Thicket Charger",
    icon: "🐗",
    defaultFor: "david",
    plowWidth: 3.2,
    topSpeed: 17.8,
    turnRate: 2.6,
    primaryHex: 0x7ee081,
    secondaryHex: 0x2a3b2c,
    glowHex: 0xf7b955,
  },
  {
    id: "starlight_glider",
    aliases: ["glide_cape", "moon_stag"],
    name: "Starlight Glide-Cape",
    tag: "Luminous Updraft Soarer",
    icon: "🦋",
    defaultFor: "sarah",
    plowWidth: 2.8,
    topSpeed: 19.4,
    turnRate: 3.1,
    primaryHex: 0x66e3ff,
    secondaryHex: 0x1f2847,
    glowHex: 0xc9a0ff,
  },
];

export const ODDROOT_UPGRADES = [
  {
    id: "or_tusk_plow",
    aliases: [],
    name: "Bramble-Tusk Plow",
    cost: 45,
    icon: "🐗",
    shortDesc: "Charge Blight-Thorns at full speed",
  },
  {
    id: "or_wide_siphon",
    aliases: [],
    name: "Wide Siphon Vortex",
    cost: 70,
    icon: "🌀",
    shortDesc: "3x wider Gloom-Spore vacuum arc",
  },
  {
    id: "or_glide_wings",
    aliases: [],
    name: "Starlight Glide-Wings",
    cost: 95,
    icon: "🦋",
    shortDesc: "Soar high across thorn chasms",
  },
  {
    id: "or_crystal_fox",
    aliases: [],
    name: "Sanctuary Crystal Fox",
    cost: 120,
    icon: "🦊",
    shortDesc: "Glowing guide fox bounds along",
  },
  {
    id: "or_spore_wake",
    aliases: ["or_prism_wake"],
    name: "Prismatic Spore Wake",
    cost: 165,
    icon: "🌈",
    shortDesc: "Bloom luminous lilies in footsteps",
  },
  {
    id: "or_antler_crown",
    aliases: [],
    name: "Celestial Antler Crown",
    cost: 230,
    icon: "👑",
    shortDesc: "Radiant starlight sanctuary aura",
  },
];

export const ODDROOT_CREATURE_STAGES = {
  1: "Sprout",
  2: "Luminous",
  3: "Astral",
};

export const ODDROOT_CREATURES = [
  {
    id: "zero_g_toad",
    aliases: ["astro_toad"],
    name: "Zero-G Astro-Toad",
    icon: "🐸",
    worldUnlock: "W1",
    desc: "Floats upside-down to bonk sky-chests",
    stages: { ...ODDROOT_CREATURE_STAGES },
  },
  {
    id: "luminous_oddling",
    aliases: [],
    name: "Luminous Oddling",
    icon: "🌱",
    worldUnlock: "W0",
    desc: "Glows warmly beside sanctuary lanterns",
    stages: { ...ODDROOT_CREATURE_STAGES },
  },
  {
    id: "sun_oddling",
    aliases: [],
    name: "Golden Sun-Oddling",
    icon: "☀️",
    worldUnlock: "W1",
    desc: "Radiates cozy golden fire-seed warmth",
    stages: { ...ODDROOT_CREATURE_STAGES },
  },
  {
    id: "frost_oddling",
    aliases: [],
    name: "Cyan Frost-Oddling",
    icon: "❄️",
    worldUnlock: "W1",
    desc: "Skates playfully on sub-zero mist",
    stages: { ...ODDROOT_CREATURE_STAGES },
  },
  {
    id: "sprout_oddling",
    aliases: [],
    name: "Pattern Sprout-Oddling",
    icon: "🌿",
    worldUnlock: "W2",
    desc: "Stacks crystal petals in neat rows",
    stages: { ...ODDROOT_CREATURE_STAGES },
  },
  {
    id: "crystal_fox",
    aliases: [],
    name: "Crystal Spirit-Fox",
    icon: "🦊",
    worldUnlock: "W3",
    desc: "Guides explorers across balance bridges",
    stages: { ...ODDROOT_CREATURE_STAGES },
  },
  {
    id: "eclipse_stag",
    aliases: [],
    name: "Eclipse Crown Stag",
    icon: "🦌",
    worldUnlock: "W5",
    desc: "Aligns moonlit antlers with star-rings",
    stages: { ...ODDROOT_CREATURE_STAGES },
  },
  {
    id: "starlight_whale",
    aliases: ["starlight_sky_whale", "aurora_whale"],
    name: "Starlight Sky-Whale",
    icon: "🐋",
    worldUnlock: "W7",
    desc: "Cruises high above aurora clouds",
    stages: { ...ODDROOT_CREATURE_STAGES },
  },
];

export const WORLDS = [
  {
    id: "W0",
    index: 0,
    rankLabel: "Prologue",
    name: "Awakening Glacier",
    guardianName: "Aurora Scout",
    realmSubtitle: "6 Aurora Beacons · Tune Your Frontier",
    gradeSpan: "Prologue",
    strand: "braided",
    accent: "#6be6d3",
    summary: "6 playful gates tune your starting frontier.",
    nodes: [
      { id: "W0.1", title: "Sun Balance", strand: "balance", kind: "eq_add" },
      { id: "W0.2", title: "Sub-Zero Drop", strand: "balance", kind: "eq_subzero_extreme" },
      { id: "W0.3", title: "Polarity Flip", strand: "balance", kind: "int_polarity" },
      { id: "W0.4", title: "Crystal Pattern", strand: "patterns", kind: "seq_linear" },
      { id: "W0.5", title: "Twin Monolith", strand: "balance", kind: "eq_twostep" },
      { id: "W0.6", title: "Canyon Lift", strand: "patterns", kind: "ramp_linear" },
    ],
  },
  {
    id: "W1",
    index: 1,
    rankLabel: "Rank I",
    name: "Sub-Zero Core",
    guardianName: "Cryo-Colossus",
    realmSubtitle: "Zero-Pair Cauldrons & Deep Ice Shafts",
    gradeSpan: "Rank I",
    strand: "balance",
    accent: "#4ad8ff",
    summary: "Zero-pair geysers, sub-zero shafts, frost vacuums, and polarity mirrors.",
    nodes: [
      { id: "W1.1", title: "Zero-Pair Melt", strand: "balance", kind: "eq_cross_zero" },
      { id: "W1.2", title: "Deep Ice Shafts", strand: "balance", kind: "eq_subzero_extreme" },
      { id: "W1.3", title: "Vacuum Lift", strand: "balance", kind: "int_double_neg" },
      { id: "W1.4", title: "Polarity Mirror", strand: "balance", kind: "int_polarity" },
    ],
  },
  {
    id: "W2",
    index: 2,
    rankLabel: "Rank II",
    name: "Crystal Loom",
    guardianName: "Prism Weaver",
    realmSubtitle: "Growing Crystal Frames & Mirror Halls",
    gradeSpan: "Rank II",
    strand: "patterns",
    accent: "#7ee081",
    summary: "Growing crystal frames, array unpackers, power towers, and mirror beams.",
    nodes: [
      { id: "W2.1", title: "Crystal Loom", strand: "patterns", kind: "seq_linear" },
      { id: "W2.2", title: "Array Merger", strand: "balance", kind: "expr_distribute" },
      { id: "W2.3", title: "Power Cores", strand: "patterns", kind: "exp_power" },
      { id: "W2.4", title: "Parallel Mirrors", strand: "spatial", kind: "geo_parallel_angles" },
    ],
  },
  {
    id: "W3",
    index: 3,
    rankLabel: "Rank III",
    name: "Titan Monoliths",
    guardianName: "Equilibrium Titan",
    realmSubtitle: "Camouflage Locks & Twin-Tower Clashes",
    gradeSpan: "Rank III",
    strand: "balance",
    accent: "#f7b955",
    summary: "Camouflaged cryo-locks, prism unpackers, twin-tower clashes, and scale sails.",
    nodes: [
      { id: "W3.1", title: "Camouflage Locks", strand: "balance", kind: "eq_twostep_camo" },
      { id: "W3.2", title: "Prism Unpacker", strand: "balance", kind: "eq_parens" },
      { id: "W3.3", title: "Twin-Tower Clash", strand: "balance", kind: "eq_both_sides" },
      { id: "W3.4", title: "Scale-Rig Sails", strand: "spatial", kind: "geo_scale_area" },
    ],
  },
  {
    id: "W4",
    index: 4,
    rankLabel: "Rank IV",
    name: "Skyway Canyons",
    guardianName: "Horizon Strider",
    realmSubtitle: "3D Hard-Light Ramps & Dual-Rig Crossings",
    gradeSpan: "Rank IV",
    strand: "patterns",
    accent: "#38d9c0",
    summary: "Extrude glowing 3D canyon ramps and dual-rig beacon crossings.",
    nodes: [
      { id: "W4.1", title: "Rise-Run Jump", strand: "patterns", kind: "ramp_slope_only" },
      { id: "W4.2", title: "Holo-Ramp y=mx+b", strand: "patterns", kind: "ramp_linear" },
      { id: "W4.3", title: "Relay Anchor", strand: "patterns", kind: "ramp_point_target" },
      { id: "W4.4", title: "Dual-Rig Crossing", strand: "patterns", kind: "sys_intersection" },
    ],
  },
  {
    id: "W5",
    index: 5,
    rankLabel: "Rank V",
    name: "Star-Ring Peaks",
    guardianName: "Astrolabe Phoenix",
    realmSubtitle: "Brass Sky-Astrolabes & Cliff Harpoons",
    gradeSpan: "Rank V",
    strand: "spatial",
    accent: "#f5c451",
    summary: "Brass Sky-Astrolabes, rigid crystal trusses, and starlight cliff harpoons.",
    nodes: [
      { id: "W5.1", title: "Crystal Truss 180°", strand: "spatial", kind: "geo_triangle_truss" },
      { id: "W5.2", title: "Sky-Astrolabe Ring", strand: "spatial", kind: "geo_astrolabe_thales" },
      { id: "W5.3", title: "Cliff Harpoon c²", strand: "spatial", kind: "geo_pythagoras" },
      { id: "W5.4", title: "Crest Beam Winch", strand: "spatial", kind: "geo_trig_ratio" },
    ],
  },
  {
    id: "W6",
    index: 6,
    rankLabel: "Rank VI",
    name: "Solar Caldera",
    guardianName: "Crown Leviathan",
    realmSubtitle: "Rainbow Sky-Arches & Mosaic Slab Forges",
    gradeSpan: "Rank VI",
    strand: "patterns",
    accent: "#ff9b71",
    summary: "Surf rainbow sky-arches, twin-landing bridges, and 3D square mosaic slabs.",
    nodes: [
      { id: "W6.1", title: "Vertex Arch Peak", strand: "patterns", kind: "arch_vertex_eval" },
      { id: "W6.2", title: "Twin-Root Span", strand: "patterns", kind: "arch_roots" },
      { id: "W6.3", title: "Square-Slab Forge", strand: "balance", kind: "quad_complete_sq" },
    ],
  },
  {
    id: "W7",
    index: 7,
    rankLabel: "Rank VII",
    name: "Aurora Crown",
    guardianName: "Nebula Sovereign",
    realmSubtitle: "Cascade Spires, Wave Crests & Quarter-Turn Portals",
    gradeSpan: "Rank VII",
    strand: "patterns",
    accent: "#66e3ff",
    summary: "Glowing crystal cascades, stage dials, aurora waves, and 90° star-portals.",
    nodes: [
      { id: "W7.1", title: "Cascade Doubler", strand: "patterns", kind: "exp_growth" },
      { id: "W7.2", title: "Log Stage Dial", strand: "patterns", kind: "log_stage" },
      { id: "W7.3", title: "Harmonic Crest", strand: "patterns", kind: "trig_wave_crest" },
      { id: "W7.4", title: "Quarter-Turn Portal", strand: "spatial", kind: "complex_i_rotation" },
    ],
  },
];

export const NODE_MAP = Object.fromEntries(
  WORLDS.flatMap((w) =>
    w.nodes.map((n) => [
      n.id,
      {
        ...n,
        worldId: w.id,
        worldIndex: w.index,
        worldName: w.name,
        rankLabel: w.rankLabel,
        guardianName: w.guardianName,
      },
    ])
  )
);

/**
 * Formal parent/educator academic map — EXCLUSIVELY for `#modal-grownups`!
 * NEVER interpolate any string from GROWN_UPS_CURRICULUM into child-facing UI.
 */
export const GROWN_UPS_CURRICULUM = {
  progressionSummary:
    "Pre-Algebra I → Pre-Algebra II → Algebra 1 Bridge → Algebra 1 Core → Euclidean Geometry & Trigonometry → Algebra 1B / 2A → Algebra 2 Core",
  worlds: {
    W0: {
      worldId: "W0",
      grownUpsStage: "Stealth Placement Calibration",
      academicStrand: "Braided Readiness Diagnostic",
      overview: "6 untimed spatial encounters routing learners across Pre-Algebra and Algebra 1 entry points.",
    },
    W1: {
      worldId: "W1",
      grownUpsStage: "Pre-Algebra I",
      academicStrand: "Directed Integers & Additive Inverses",
      overview: "Zero-pair cancellation, sub-zero relational equations, subtracting negatives, and signed multiplication.",
    },
    W2: {
      worldId: "W2",
      grownUpsStage: "Pre-Algebra II",
      academicStrand: "Algebraic Patterns, Expressions & Angle Laws",
      overview: "Explicit linear growth formulas (an + b), distributive arrays, integer exponents, and transversal angles.",
    },
    W3: {
      worldId: "W3",
      grownUpsStage: "Algebra 1 Bridge",
      academicStrand: "Multi-Step Linear Equations & Proportional Scaling",
      overview: "Camouflaged negative-coefficient equations, parentheses, variables on both sides, and k² area scaling.",
    },
    W4: {
      worldId: "W4",
      grownUpsStage: "Algebra 1 Core",
      academicStrand: "Linear Functions, Slope & Systems",
      overview: "Rate of change m = Δy/Δx, slope-intercept y = mx + b, point-slope targeting, and linear systems.",
    },
    W5: {
      worldId: "W5",
      grownUpsStage: "Euclidean Geometry & Trigonometry",
      academicStrand: "Deductive Invariants, Circles & Right-Triangle Trig",
      overview: "Triangle 180° invariants, Thales' semicircle theorem, Pythagorean distance, and sin/cos/tan ratios.",
    },
    W6: {
      worldId: "W6",
      grownUpsStage: "Algebra 1B / 2A",
      academicStrand: "Quadratic Functions & Geometric Factoring",
      overview: "Vertex form a(x - h)² + k, factored roots & symmetry, and 3D completing-the-square.",
    },
    W7: {
      worldId: "W7",
      grownUpsStage: "Algebra 2 Core",
      academicStrand: "Exponentials, Logarithms, Waves & Complex Plane",
      overview: "Exponential growth a·b^x, logarithmic stage counters, sinusoidal amplitude/midline, and complex i rotations.",
    },
  },
  nodes: {
    "W0.1": { worldId: "W0", grownUpsStage: "Stealth Placement Calibration", grownUpsTopic: "One-step relational equality (n + a = b)" },
    "W0.2": { worldId: "W0", grownUpsStage: "Stealth Placement Calibration", grownUpsTopic: "Sub-zero relational balance across zero (n + a = b - c)" },
    "W0.3": { worldId: "W0", grownUpsStage: "Stealth Placement Calibration", grownUpsTopic: "Signed integer multiplication & polarity symmetry" },
    "W0.4": { worldId: "W0", grownUpsStage: "Stealth Placement Calibration", grownUpsTopic: "Linear arithmetic sequences & explicit an + b rules" },
    "W0.5": { worldId: "W0", grownUpsStage: "Stealth Placement Calibration", grownUpsTopic: "Two-step linear equations (an + b = c)" },
    "W0.6": { worldId: "W0", grownUpsStage: "Stealth Placement Calibration", grownUpsTopic: "Coordinate slope-intercept functions (y = mx + b)" },
    "W1.1": { worldId: "W1", grownUpsStage: "Pre-Algebra I", grownUpsTopic: "Zero-pair cancellation & additive equations crossing zero" },
    "W1.2": { worldId: "W1", grownUpsStage: "Pre-Algebra I", grownUpsTopic: "Multi-term sub-zero relational equations (n + k₁ = k₂ - k₃)" },
    "W1.3": { worldId: "W1", grownUpsStage: "Pre-Algebra I", grownUpsTopic: "Subtracting negative integers: a - (-b) = a + b" },
    "W1.4": { worldId: "W1", grownUpsStage: "Pre-Algebra I", grownUpsTopic: "Signed integer multiplication (-a)(-b) and (-a)(b)" },
    "W2.1": { worldId: "W2", grownUpsStage: "Pre-Algebra II", grownUpsTopic: "Explicit linear pattern generalization f(k) = b + mk" },
    "W2.2": { worldId: "W2", grownUpsStage: "Pre-Algebra II", grownUpsTopic: "Distributive property & array equivalence a(n ± b)" },
    "W2.3": { worldId: "W2", grownUpsStage: "Pre-Algebra II", grownUpsTopic: "Integer exponents & repeated multiplication (b^k)" },
    "W2.4": { worldId: "W2", grownUpsStage: "Pre-Algebra II", grownUpsTopic: "Parallel lines, alternate interior & supplementary angles" },
    "W3.1": { worldId: "W3", grownUpsStage: "Algebra 1 Bridge", grownUpsTopic: "Camouflaged two-step equations (c = b - an) & like-term structure" },
    "W3.2": { worldId: "W3", grownUpsStage: "Algebra 1 Bridge", grownUpsTopic: "Linear equations with grouping symbols a(n ± b) = c" },
    "W3.3": { worldId: "W3", grownUpsStage: "Algebra 1 Bridge", grownUpsTopic: "Linear equations with variables on both sides (an + b = cn + d)" },
    "W3.4": { worldId: "W3", grownUpsStage: "Algebra 1 Bridge", grownUpsTopic: "Geometric similarity & quadratic area scale factor (Area × k²)" },
    "W4.1": { worldId: "W4", grownUpsStage: "Algebra 1 Core", grownUpsTopic: "Constant rate of change & slope m = Δy / Δx" },
    "W4.2": { worldId: "W4", grownUpsStage: "Algebra 1 Core", grownUpsTopic: "Slope-intercept linear functions y = mx + b" },
    "W4.3": { worldId: "W4", grownUpsStage: "Algebra 1 Core", grownUpsTopic: "Solving for y-intercept b from slope m and point (x, y)" },
    "W4.4": { worldId: "W4", grownUpsStage: "Algebra 1 Core", grownUpsTopic: "Systems of linear equations & intersection coordinates" },
    "W5.1": { worldId: "W5", grownUpsStage: "Euclidean Geometry & Trigonometry", grownUpsTopic: "Triangle interior angle sum theorem (α + β + γ = 180°)" },
    "W5.2": { worldId: "W5", grownUpsStage: "Euclidean Geometry & Trigonometry", grownUpsTopic: "Thales' theorem & inscribed right angles on a diameter" },
    "W5.3": { worldId: "W5", grownUpsStage: "Euclidean Geometry & Trigonometry", grownUpsTopic: "Pythagorean theorem (a² + b² = c²) in 3D space" },
    "W5.4": { worldId: "W5", grownUpsStage: "Euclidean Geometry & Trigonometry", grownUpsTopic: "Right-triangle trigonometric ratios (sin, cos, tan)" },
    "W6.1": { worldId: "W6", grownUpsStage: "Algebra 1B / 2A", grownUpsTopic: "Quadratic functions in vertex form y = a(x - h)² + k" },
    "W6.2": { worldId: "W6", grownUpsStage: "Algebra 1B / 2A", grownUpsTopic: "Factored-form quadratics, roots & axis of symmetry" },
    "W6.3": { worldId: "W6", grownUpsStage: "Algebra 1B / 2A", grownUpsTopic: "Geometric completing the square x² + bx + (b/2)² = (x + b/2)²" },
    "W7.1": { worldId: "W7", grownUpsStage: "Algebra 2 Core", grownUpsTopic: "Exponential growth functions y = a · b^x" },
    "W7.2": { worldId: "W7", grownUpsStage: "Algebra 2 Core", grownUpsTopic: "Logarithms as inverse exponent counters log_b(y) = n" },
    "W7.3": { worldId: "W7", grownUpsStage: "Algebra 2 Core", grownUpsTopic: "Sinusoidal wave amplitude & midline y = A sin(x) + D" },
    "W7.4": { worldId: "W7", grownUpsStage: "Algebra 2 Core", grownUpsTopic: "Complex numbers & Argand 90° quarter-turn rotations (i² = -1, i⁴ = 1)" },
  },
};

export function getGrownUpsWorldCurriculum(worldId) {
  return GROWN_UPS_CURRICULUM.worlds[worldId] || null;
}

export function getGrownUpsNodeTopic(nodeId) {
  return GROWN_UPS_CURRICULUM.nodes[nodeId] || null;
}

const ATOMIC_REPAIR_MAP = {
  "W1.1": "W1.3",
  "W1.2": "W1.1",
  "W1.3": "W1.1",
  "W1.4": "W1.3",
  "W2.1": "W1.1",
  "W2.2": "W1.4",
  "W2.3": "W2.1",
  "W2.4": "W1.1",
  "W3.1": "W1.4",
  "W3.2": "W2.2",
  "W3.3": "W3.1",
  "W3.4": "W2.3",
  "W4.1": "W1.4",
  "W4.2": "W4.1",
  "W4.3": "W4.1",
  "W4.4": "W3.3",
  "W5.1": "W2.4",
  "W5.2": "W5.1",
  "W5.3": "W2.3",
  "W5.4": "W5.3",
  "W6.1": "W2.3",
  "W6.2": "W6.1",
  "W6.3": "W3.4",
  "W7.1": "W2.3",
  "W7.2": "W7.1",
  "W7.3": "W6.1",
  "W7.4": "W1.4",
};

export const CANONICAL_STEPS = Object.freeze({
  eq_add: 1,
  eq_cross_zero: 1,
  eq_subzero_extreme: 1,
  int_double_neg: 1,
  int_polarity: 1,
  seq_linear: 1,
  expr_distribute: 1,
  exp_power: 1,
  geo_parallel_angles: 1,
  eq_twostep: 2,
  eq_twostep_camo: 2,
  eq_parens: 3,
  eq_both_sides: 3,
  geo_scale_area: 1,
  ramp_slope_only: 1,
  ramp_linear: 1,
  ramp_point_target: 1,
  sys_intersection: 3,
  geo_triangle_truss: 1,
  geo_astrolabe_thales: 1,
  geo_pythagoras: 1,
  geo_trig_ratio: 1,
  arch_vertex_eval: 1,
  arch_roots: 1,
  quad_complete_sq: 1,
  exp_growth: 1,
  log_stage: 1,
  trig_wave_crest: 1,
  complex_i_rotation: 1,
});

const MULTI_STEP_KINDS = new Set(
  Object.entries(CANONICAL_STEPS)
    .filter(([, count]) => count > 1)
    .map(([k]) => k)
);

function pick(arr, rng = Math.random) {
  return arr[Math.floor(rng() * arr.length)];
}

function randInt(min, max, rng = Math.random) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function normZero(v) {
  return v === 0 ? 0 : v;
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
  const equippedChassis = preset === "sarah" ? "aurora_sled" : "terra_dozer";
  const equippedMount = preset === "sarah" ? "starlight_glider" : "bramble_boar";

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
      nodes[id].wins = 2;
      nodes[id].camouflageCleared = true;
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
    equippedChassis,
    ownedUpgrades: [],
    discoveredMysteries: [],
    seenTrickFamilies: [],
    weeklySunshine: {
      weekKey: "",
      days: [],
    },
    misconceptionTags: {},
    records: {
      bestOverdriveStreak: 0,
      longestRampM: 0,
      deepestSubZero: 0,
      foxesWoken: 0,
      creaturesHatched: 0,
      highestVineM: 0,
    },
    games: {
      frostwake: {
        equippedChassis,
        snowClearedM2: 0,
        rimeCreepsCleared: 0,
        foxDensThawed: 0,
        bestWaveSec: null,
        ghostFrames: [],
        ghostBest: null,
      },
      oddroot: {
        equippedMount,
        equippedStaff: "sun_siphon",
        cauldronsBrewed: 0,
        hatchedCreatures: [],
        creatureStages: {},
        sanctuaryUpgrades: [],
        blightClearedM2: 0,
        blightClearedCount: 0,
        longestVineGrindM: 0,
        bestCircuitSec: null,
        ghostFrames: [],
        ghostBest: null,
        mosaicForged: false,
      },
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
    surgeFinalPending: false,
    surgeRepairNodeId: null,
    cooldownRemaining: 0,
    calibrationCursor: 0,
    calibrationSpawnedIds: [],
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
 * All child-facing copy strictly obeys <= 6 words and zero banned or school words.
 */
export function generateEncounter(nodeId, options = {}) {
  const rng = options.rng || Math.random;
  const meta = NODE_MAP[nodeId] || NODE_MAP["W1.1"];
  const camo = Boolean(options.camouflage) || meta.kind === "eq_twostep_camo";
  const simplified = Boolean(options.simplified);
  const uid = `${nodeId}-${Date.now().toString(36)}-${randInt(100, 999, rng)}`;

  switch (meta.kind) {
    case "eq_add": {
      const n = simplified ? randInt(3, 9, rng) : randInt(4, 16, rng);
      const a = simplified ? randInt(2, 7, rng) : randInt(3, 12, rng);
      const rhs = n + a;
      return makeEquationEncounter({
        uid,
        nodeId,
        meta,
        promptShort: "Balance both crystal towers",
        displayEq: camo ? `${rhs} = ${a} + n` : `n + ${a} = ${rhs}`,
        answer: n,
        left: camo ? { a: 0, b: rhs } : { a: 1, b: a },
        right: camo ? { a: 1, b: a } : { a: 0, b: rhs },
        detents: [-10, -5, -1, 1, 5, 10],
        startDial: 0,
        isCamouflage: camo,
        isSimplified: simplified,
      });
    }

    case "eq_cross_zero": {
      const n = simplified ? -randInt(2, 8, rng) : -randInt(3, 18, rng);
      const a = simplified ? randInt(5, 12, rng) : randInt(6, 22, rng);
      const rhs = n + a;
      return makeEquationEncounter({
        uid,
        nodeId,
        meta,
        promptShort: "Melt blocks to balance n",
        displayEq: camo ? `${rhs} = ${a} + n` : `n + ${a} = ${rhs}`,
        answer: n,
        left: camo ? { a: 0, b: rhs } : { a: 1, b: a },
        right: camo ? { a: 1, b: a } : { a: 0, b: rhs },
        detents: [-10, -5, -1, 1, 5, 10],
        startDial: 0,
        isCamouflage: camo,
        isSimplified: simplified,
      });
    }

    case "eq_subzero_extreme": {
      const step = simplified ? pick([10, 20, 25], rng) : pick([20, 25, 50, 100], rng);
      const k1 = randInt(1, simplified ? 3 : 4, rng) * step;
      const k2 = randInt(1, 3, rng) * step;
      const k3 = k2 + randInt(1, simplified ? 2 : 3, rng) * step;
      const rhs = k2 - k3;
      const n = rhs - k1;
      return makeEquationEncounter({
        uid,
        nodeId,
        meta,
        promptShort: "Drop into sub-zero balance",
        displayEq: camo ? `${k2} - ${k3} = ${k1} + n` : `n + ${k1} = ${k2} - ${k3}`,
        answer: n,
        left: camo ? { a: 0, b: rhs } : { a: 1, b: k1 },
        right: camo ? { a: 1, b: k1 } : { a: 0, b: rhs },
        detents: [-100, -25, -5, 5, 25, 100],
        startDial: 0,
        isCamouflage: camo,
        isSimplified: simplified,
      });
    }

    case "int_double_neg": {
      const base = simplified ? randInt(2, 14, rng) : randInt(-20, 30, rng);
      const lift = simplified ? randInt(3, 10, rng) : randInt(5, 25, rng);
      const ans = base + lift;
      return {
        uid,
        nodeId,
        kind: meta.kind,
        worldId: meta.worldId,
        strand: meta.strand,
        encounterType: "cryo_gate",
        title: meta.title,
        promptShort: "Vacuum ice blocks: lift up!",
        equationText: camo ? `n = ${base} - (-${lift})` : `${base} - (-${lift}) = n`,
        targetLabel: "n",
        answer: ans,
        startDial: base,
        detents: [-10, -5, -1, 1, 5, 10],
        isCamouflage: camo,
        isSimplified: simplified,
        towers: { leftA: 0, leftB: ans, rightA: 1, rightB: 0 },
        beamActions: [
          {
            id: "flip_neg",
            label: `Flip -(-${lift}) → +${lift}`,
            kind: "hint_transform",
            nextEquationText: camo ? `n = ${base} + ${lift}` : `${base} + ${lift} = n`,
            cue: "Pulling ice lifts you up!",
          },
        ],
        stepsUsed: 0,
        missesOnItem: 0,
        visualHint: `Removing ${lift} ice weights floats +${lift} higher`,
      };
    }

    case "int_polarity": {
      const a = simplified ? -randInt(2, 5, rng) : -randInt(2, 9, rng);
      const b = simplified ? pick([-5, -4, -3, 3, 4], rng) : pick([-8, -6, -5, -4, -3, 4, 6], rng);
      const ans = a * b;
      return {
        uid,
        nodeId,
        kind: meta.kind,
        worldId: meta.worldId,
        strand: meta.strand,
        encounterType: "cryo_gate",
        title: meta.title,
        promptShort: "Aim the polarity mirror beam",
        equationText: camo ? `n = (${b}) × (${a})` : `(${a}) × (${b}) = n`,
        targetLabel: "n",
        answer: ans,
        startDial: 0,
        detents: [-10, -5, -1, 1, 5, 10],
        isCamouflage: camo,
        isSimplified: simplified,
        polarityMeta: { a, b },
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
        stepsUsed: 0,
        missesOnItem: 0,
        visualHint: `${Math.abs(a)} groups of ${Math.abs(b)} with polarity flip`,
      };
    }

    case "seq_linear": {
      const m = simplified ? randInt(2, 4, rng) : randInt(2, 6, rng);
      const b = randInt(1, 7, rng);
      const targetStep = simplified ? pick([6, 8, 10], rng) : pick([8, 10, 12, 15, 20], rng);
      const t1 = b + 1 * m;
      const t2 = b + 2 * m;
      const t3 = b + 3 * m;
      const ans = b + targetStep * m;
      const frames = [
        { step: 1, base: b, groups: 1, perGroup: m, total: t1 },
        { step: 2, base: b, groups: 2, perGroup: m, total: t2 },
        { step: 3, base: b, groups: 3, perGroup: m, total: t3 },
      ];
      return {
        uid,
        nodeId,
        kind: meta.kind,
        worldId: meta.worldId,
        strand: meta.strand,
        encounterType: "aurora_cascade",
        title: meta.title,
        promptShort: `Count crystals in Frame ${targetStep}`,
        equationText: camo
          ? `Frame 1: [1×${m} + ${b}] · Frame 2: [2×${m} + ${b}] → Frame ${targetStep} = ?`
          : `Frame 1: [${b} + 1×${m}] · Frame 2: [${b} + 2×${m}] → Frame ${targetStep} = ?`,
        targetLabel: `Frame ${targetStep}`,
        answer: ans,
        startDial: t3,
        detents: [-10, -5, -1, 1, 5, 10],
        isCamouflage: camo,
        isSimplified: simplified,
        patternMeta: {
          baseCount: b,
          stepGrowth: m,
          targetStep,
          frames,
          ruleVisual: "Base + Frame × Group",
          terms: [t1, t2, t3],
          a: m,
          m,
          b,
        },
        beamActions: [
          {
            id: "show_growth",
            label: `Build rule: ${b} + k×${m}`,
            kind: "hint_transform",
            nextEquationText: `Rule: ${b} + Frame×${m} → ${b} + ${targetStep}×${m}`,
            cue: `${b} base + ${m} per frame!`,
          },
        ],
        stepsUsed: 0,
        missesOnItem: 0,
        visualHint: `Base ${b} + (${targetStep} × ${m}) = ${ans}`,
      };
    }

    case "expr_distribute": {
      const a = simplified ? randInt(2, 4, rng) : randInt(2, 5, rng);
      const b = simplified ? pick([2, 3, 4], rng) : pick([-4, -3, -2, 2, 3, 5], rng);
      const nVal = simplified ? randInt(2, 5, rng) : randInt(2, 7, rng);
      const ans = a * (nVal + b);
      const signB = b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`;
      const expanded = formatLinearExpr(a, a * b, "n");
      return {
        uid,
        nodeId,
        kind: meta.kind,
        worldId: meta.worldId,
        strand: meta.strand,
        encounterType: "cryo_gate",
        title: meta.title,
        promptShort: `Power array when n = ${nVal}`,
        equationText: camo ? `(n ${signB}) × ${a}  [n = ${nVal}]` : `${a}(n ${signB})  [n = ${nVal}]`,
        targetLabel: "Flux",
        answer: ans,
        startDial: 0,
        detents: [-10, -5, -1, 1, 5, 10],
        isCamouflage: camo,
        isSimplified: simplified,
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
        stepsUsed: 0,
        missesOnItem: 0,
        visualHint: `${a} × (${nVal} ${signB}) = ${ans}`,
      };
    }

    case "exp_power": {
      const pair = simplified
        ? pick([[2, 3], [2, 4], [3, 2]], rng)
        : pick([[2, 3], [2, 4], [2, 5], [3, 3], [3, 4], [4, 3], [5, 3]], rng);
      const [base, exp] = pair;
      const ans = Math.pow(base, exp);
      return {
        uid,
        nodeId,
        kind: meta.kind,
        worldId: meta.worldId,
        strand: meta.strand,
        encounterType: "aurora_cascade",
        title: meta.title,
        promptShort: "Ignite the crystal power tower",
        equationText: camo ? `n = ${base}^${exp}` : `${base}^${exp} = n`,
        targetLabel: "n",
        answer: ans,
        startDial: base * exp,
        detents: [-25, -5, -1, 1, 5, 25],
        isCamouflage: camo,
        isSimplified: simplified,
        powerMeta: { base, exp },
        beamActions: [
          {
            id: "expand_pow",
            label: `Expand ${exp} stages of ×${base}`,
            kind: "hint_transform",
            nextEquationText: `${Array(exp).fill(base).join(" × ")} = n`,
            cue: `Multiply by ${base}, ${exp} times!`,
          },
        ],
        stepsUsed: 0,
        missesOnItem: 0,
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
        kind: meta.kind,
        worldId: meta.worldId,
        strand: meta.strand,
        encounterType: "astrolabe_shrine",
        title: meta.title,
        promptShort: mode === "alt" ? "Lock Z-mirror beam angle" : "Complete 180° straight beam",
        equationText:
          mode === "alt"
            ? camo
              ? `Tilted Z-Angle: ${given}° → θ°`
              : `Parallel Z-Angle: ${given}° → θ°`
            : camo
            ? `Tilted Mirror Pair: θ° + ${given}° = 180°`
            : `Straight Mirror Pair: ${given}° + θ° = 180°`,
        targetLabel: "θ°",
        answer: ans,
        startDial: 90,
        detents: [-25, -10, -1, 1, 10, 25],
        isCamouflage: camo,
        isSimplified: simplified,
        astrolabeMeta: { mode, given, target: ans, rotatedDeg: camo ? 37 : 0 },
        beamActions: [
          {
            id: "mirror_law",
            label: mode === "alt" ? "Slide angle along beam" : "180° - known angle",
            kind: "hint_transform",
            nextEquationText: mode === "alt" ? `Z-Mirror match: θ = ${given}°` : `θ = 180° - ${given}°`,
            cue: mode === "alt" ? "Parallel mirrors match!" : "Half-turn equals 180°!",
          },
        ],
        stepsUsed: 0,
        missesOnItem: 0,
        visualHint: mode === "alt" ? `Equal Z-angles: ${ans}°` : `180° - ${given}° = ${ans}°`,
      };
    }

    case "eq_twostep":
    case "eq_twostep_camo": {
      if (camo) {
        // Camouflaged form: c = b - a*n (protects learners from 6 - 2n -> 4n like-term trap!)
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
          isSimplified: simplified,
        });
        eq.beamActions.unshift({
          id: "repel_trap",
          label: `Merge ${b} - ${a}n → ${b - a}n?`,
          kind: "repel_trap",
          tag: "like_term_repulsion",
          cue: "Gold cubes & N-cores repel!",
        });
        eq._initialSnapshot.beamActions = eq.beamActions.map((act) => ({ ...act }));
        return eq;
      }
      const a = simplified ? randInt(2, 3, rng) : randInt(2, 5, rng);
      const n = simplified ? randInt(2, 7, rng) : randInt(-5, 9, rng);
      const b = simplified ? pick([2, 4, 5], rng) : pick([-9, -6, -4, 3, 5, 7], rng);
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
        isCamouflage: false,
        isSimplified: simplified,
      });
    }

    case "eq_parens": {
      const a = simplified ? randInt(2, 4, rng) : randInt(2, 5, rng);
      const b = camo
        ? pick([2, 3, 4, 5], rng)
        : simplified
        ? pick([2, 3, 4], rng)
        : pick([-5, -4, -3, -2, 2, 3, 4], rng);
      const n = simplified ? randInt(2, 7, rng) : randInt(-3, 9, rng);
      const rhs = a * (n + b);
      const signB = b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`;
      const displayEq = camo ? `${a}(${b} + n) = ${rhs}` : `${a}(n ${signB}) = ${rhs}`;
      const enc = makeEquationEncounter({
        uid,
        nodeId,
        meta,
        promptShort: "Unpack or mental-shatter gate",
        displayEq,
        answer: n,
        left: { a, b: a * b, grouped: { factor: a, innerB: b } },
        right: { a: 0, b: rhs },
        detents: [-10, -5, -1, 1, 5, 10],
        startDial: 0,
        isCamouflage: camo,
        isSimplified: simplified,
      });
      enc.beamActions.unshift({
        id: "divide_outer",
        label: `Split both ÷${a}`,
        kind: "sym_step",
        isShortcut: true,
        nextLeft: { a: 1, b },
        nextRight: { a: 0, b: rhs / a },
        nextEquationText: camo ? `${b} + n = ${rhs / a}` : `n ${signB} = ${rhs / a}`,
        cue: `Each group holds ${rhs / a}!`,
      });
      enc._initialSnapshot.beamActions = enc.beamActions.map((act) => ({ ...act }));
      return enc;
    }

    case "eq_both_sides": {
      const n = simplified ? randInt(1, 6, rng) : randInt(-4, 8, rng);
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
        displayEq: `${formatLinearExpr(leftA, leftB, "n", camo)} = ${formatLinearExpr(rightA, rightB, "n", camo)}`,
        answer: n,
        left: { a: leftA, b: leftB },
        right: { a: rightA, b: rightB },
        detents: [-10, -5, -1, 1, 5, 10],
        startDial: 0,
        isCamouflage: camo,
        isSimplified: simplified,
      });
    }

    case "geo_scale_area": {
      const k = simplified ? randInt(2, 3, rng) : randInt(2, 5, rng);
      const baseArea = randInt(3, 10, rng);
      const ans = baseArea * k * k;
      return {
        uid,
        nodeId,
        kind: meta.kind,
        worldId: meta.worldId,
        strand: meta.strand,
        encounterType: "astrolabe_shrine",
        title: meta.title,
        promptShort: `Scale ${k}×: new sail area?`,
        equationText: camo
          ? `Scale k = ${k}× on Base Sail = ${baseArea} m² → Area?`
          : `Base Sail = ${baseArea} m² · Scale k = ${k}× → Area?`,
        targetLabel: "m²",
        answer: ans,
        startDial: baseArea * k,
        detents: [-25, -5, -1, 1, 5, 25],
        isCamouflage: camo,
        isSimplified: simplified,
        scaleMeta: { k, baseArea, ans },
        beamActions: [
          {
            id: "area_grid",
            label: `Tile ${k}×${k} area grid (×${k * k})`,
            kind: "hint_transform",
            nextEquationText: `Area scales by k² = ${k}² = ${k * k} → ${baseArea} × ${k * k}`,
            cue: `Width AND height scale ×${k}!`,
          },
        ],
        stepsUsed: 0,
        missesOnItem: 0,
        visualHint: `${baseArea} × ${k}² = ${ans} m²`,
      };
    }

    case "ramp_slope_only": {
      const run = pick([3, 4, 5, 6], rng);
      const m = simplified ? pick([1, 2, 3], rng) : pick([-2, -1, 1, 2, 3, 4], rng);
      const rise = m * run;
      return {
        uid,
        nodeId,
        kind: meta.kind,
        worldId: meta.worldId,
        strand: meta.strand,
        encounterType: "holo_ramp",
        title: meta.title,
        promptShort: "Dial slope m (rise ÷ run)",
        equationText: camo
          ? `Ring Height Δy = ${rise}m · Run Δx = ${run}m → Slope m?`
          : `Run Δx = ${run}m · Ring Height Δy = ${rise}m → Slope m?`,
        targetLabel: "Slope m",
        answer: m,
        startDial: 0,
        detents: [-2, -1, 1, 2],
        isCamouflage: camo,
        isSimplified: simplified,
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
        stepsUsed: 0,
        missesOnItem: 0,
        visualHint: `Slope m = ${rise} ÷ ${run} = ${m}`,
      };
    }

    case "ramp_linear":
    case "ramp_point_target": {
      const m = simplified ? pick([1, 2, 3], rng) : pick([-2, -1, 1, 2, 3], rng);
      const b = simplified ? randInt(1, 5, rng) : randInt(-3, 6, rng);
      const targetX = pick([4, 5, 6], rng);
      const targetY = m * targetX + b;
      const solveForB = meta.kind === "ramp_point_target";
      const ans = solveForB ? b : m;
      return {
        uid,
        nodeId,
        kind: meta.kind,
        worldId: meta.worldId,
        strand: meta.strand,
        encounterType: "holo_ramp",
        title: meta.title,
        promptShort: solveForB ? "Dial lift b to hit ring" : "Dial slope m to hit ring",
        equationText: solveForB
          ? camo
            ? `Ring (${targetX}, ${targetY}) on y = b + ${m}x → Lift b?`
            : `y = ${m}x + b through (${targetX}, ${targetY}) → Lift b?`
          : camo
          ? `Ring at (${targetX}, ${targetY}) · Pad Lift b = ${b} → Slope m?`
          : `Pad Lift b = ${b} · Ring at (${targetX}, ${targetY}) → Slope m?`,
        targetLabel: solveForB ? "Lift b" : "Slope m",
        answer: ans,
        startDial: 0,
        detents: [-5, -1, 1, 5],
        isCamouflage: camo,
        isSimplified: simplified,
        rampMeta: { m, b, targetX, targetY, solveForB },
        beamActions: [
          {
            id: "ramp_offset",
            label: solveForB
              ? `Slope climbs ${m * targetX}m over ${targetX}m`
              : `Climb Δy=${targetY - b}m over ${targetX}m`,
            kind: "hint_transform",
            nextEquationText: solveForB
              ? `${targetY} = ${m * targetX} + b`
              : `m = (${targetY} - ${b}) ÷ ${targetX}`,
            cue: solveForB ? "Match ring height at x!" : "Climb from pad to ring!",
          },
        ],
        stepsUsed: 0,
        missesOnItem: 0,
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
        displayEq: `${formatLinearExpr(m1, b1, "x", camo)} = ${formatLinearExpr(m2, b2, "x", camo)}`,
        answer: xAns,
        left: { a: m1, b: b1 },
        right: { a: m2, b: b2 },
        varSymbol: "x",
        detents: [-5, -1, 1, 5],
        startDial: 0,
        isCamouflage: camo,
        isSimplified: simplified,
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
        kind: meta.kind,
        worldId: meta.worldId,
        strand: meta.strand,
        encounterType: "astrolabe_shrine",
        title: meta.title,
        promptShort: "Lock rigid crystal truss (180°)",
        equationText: camo
          ? `Tilted Truss: θ° + ${a1}° + ${a2}° = 180°`
          : `Crystal Truss: ${a1}° + ${a2}° + θ° = 180°`,
        targetLabel: "θ°",
        answer: ans,
        startDial: 60,
        detents: [-25, -10, -1, 1, 10, 25],
        isCamouflage: camo,
        isSimplified: simplified,
        astrolabeMeta: { mode: "truss", a1, a2, target: ans, rotatedDeg: camo ? 37 : 0 },
        beamActions: [
          {
            id: "sum_two",
            label: `Combine ${a1}° + ${a2}° = ${a1 + a2}°`,
            kind: "hint_transform",
            nextEquationText: `${a1 + a2}° + θ° = 180°`,
            cue: "Three corners lock at 180°!",
          },
        ],
        stepsUsed: 0,
        missesOnItem: 0,
        visualHint: `180° - ${a1 + a2}° = ${ans}°`,
      };
    }

    case "geo_astrolabe_thales": {
      const alpha = randInt(22, 68, rng);
      const ans = 90 - alpha;
      return {
        uid,
        nodeId,
        kind: meta.kind,
        worldId: meta.worldId,
        strand: meta.strand,
        encounterType: "astrolabe_shrine",
        title: meta.title,
        promptShort: "Align Sky-Astrolabe semicircle",
        equationText: camo
          ? `Tilted Semicircle (90° Peak) · α = ${alpha}° → β°?`
          : `Diameter Arc (90° Peak) · α = ${alpha}° → β°?`,
        targetLabel: "β°",
        answer: ans,
        startDial: 45,
        detents: [-10, -5, -1, 1, 5, 10],
        isCamouflage: camo,
        isSimplified: simplified,
        astrolabeMeta: { mode: "thales", alpha, target: ans, rotatedDeg: camo ? 37 : 0 },
        beamActions: [
          {
            id: "thales_law",
            label: "Diameter inscribes 90° corner!",
            kind: "hint_transform",
            nextEquationText: `90° + ${alpha}° + β° = 180° → β = 90° - ${alpha}°`,
            cue: "Semicircle locks a 90° peak!",
          },
        ],
        stepsUsed: 0,
        missesOnItem: 0,
        visualHint: `Star-Ring Arc: 90° - ${alpha}° = ${ans}°`,
      };
    }

    case "geo_pythagoras": {
      const triple = simplified
        ? pick([[3, 4, 5], [6, 8, 10]], rng)
        : pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17]], rng);
      const [legA, legB, hyp] = triple;
      return {
        uid,
        nodeId,
        kind: meta.kind,
        worldId: meta.worldId,
        strand: meta.strand,
        encounterType: "harpoon_cliff",
        title: meta.title,
        promptShort: "Tension cliff harpoon cable c",
        equationText: camo
          ? `Cliff ${legB}m · Base ${legA}m → Cable c?`
          : `Base ${legA}m · Cliff ${legB}m → Cable c?`,
        targetLabel: "Cable m",
        answer: hyp,
        startDial: legB,
        detents: [-5, -1, 1, 5],
        isCamouflage: camo,
        isSimplified: simplified,
        harpoonMeta: { legA, legB, hyp, swappedLegs: camo },
        beamActions: [
          {
            id: "pythag_squares",
            label: `Squares: ${legA * legA}+${legB * legB} = ${hyp * hyp}`,
            kind: "hint_transform",
            nextEquationText: `c² = ${hyp * hyp} → √${hyp * hyp}`,
            cue: "Leg squares build cable c²!",
          },
        ],
        stepsUsed: 0,
        missesOnItem: 0,
        visualHint: `√(${legA}² + ${legB}²) = ${hyp}m`,
      };
    }

    case "geo_trig_ratio": {
      const spec = pick(
        [
          { angle: 30, fn: "sin", ratioLabel: "sin 30° = 0.5", mult: 0.5, hyp: 20, ans: 10, prompt: "Cliff height: hyp × sin 30°" },
          { angle: 30, fn: "sin", ratioLabel: "sin 30° = 0.5", mult: 0.5, hyp: 36, ans: 18, prompt: "Cliff height: hyp × sin 30°" },
          { angle: 45, fn: "tan", ratioLabel: "tan 45° = 1", mult: 1, adj: 14, ans: 14, prompt: "45° beam: height matches base" },
          { angle: 60, fn: "cos", ratioLabel: "cos 60° = 0.5", mult: 0.5, hyp: 24, ans: 12, prompt: "Base span: hyp × cos 60°" },
        ],
        rng
      );
      const span = spec.hyp || spec.adj;
      return {
        uid,
        nodeId,
        kind: meta.kind,
        worldId: meta.worldId,
        strand: meta.strand,
        encounterType: "harpoon_cliff",
        title: meta.title,
        promptShort: spec.prompt,
        equationText: camo
          ? `Span ${span}m · Angle ${spec.angle}° (${spec.ratioLabel}) → Target?`
          : `Angle ${spec.angle}° (${spec.ratioLabel}) · Span ${span}m → Target?`,
        targetLabel: "Meters",
        answer: spec.ans,
        startDial: 10,
        detents: [-10, -5, -1, 1, 5, 10],
        isCamouflage: camo,
        isSimplified: simplified,
        harpoonMeta: { legA: spec.ans, legB: spec.ans, hyp: span },
        ratioMeta: { angle: spec.angle, fn: spec.fn, ratioLabel: spec.ratioLabel, mult: spec.mult, span },
        beamActions: [
          {
            id: "ratio_key",
            label: `Apply ${spec.ratioLabel}`,
            kind: "hint_transform",
            nextEquationText: `${span} × ${spec.fn === "tan" ? "1" : "0.5"} = ?`,
            cue: `${spec.fn} ${spec.angle}° scales the span!`,
          },
        ],
        stepsUsed: 0,
        missesOnItem: 0,
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
      const aTerm = `${a === -1 ? "-" : a}(x - ${h})²`;
      return {
        uid,
        nodeId,
        kind: meta.kind,
        worldId: meta.worldId,
        strand: meta.strand,
        encounterType: "rainbow_arch",
        title: meta.title,
        promptShort: askPeak ? "Dial rainbow arch peak height k" : `Arch height at x = ${xProbe}`,
        equationText: askPeak
          ? camo
            ? `Arch y = ${k} ${aTerm} → Peak Height?`
            : `Arch y = ${aTerm} + ${k} → Peak Height?`
          : camo
          ? `Arch y = ${k} ${aTerm} at x = ${xProbe}`
          : `Arch y = ${aTerm} + ${k} at x = ${xProbe}`,
        targetLabel: "Height y",
        answer: askPeak ? k : yProbe,
        startDial: 0,
        detents: [-5, -1, 1, 5],
        isCamouflage: camo,
        isSimplified: simplified,
        archMeta: { a, h, k, r1: h - 3, r2: h + 3 },
        beamActions: [
          {
            id: "vertex_spot",
            label: askPeak ? `x=${h} zeroes square term` : `(${xProbe} - ${h})² = 4`,
            kind: "hint_transform",
            nextEquationText: askPeak ? `Peak sits right at (${h}, ${k})` : `y = ${a}(4) + ${k}`,
            cue: "Vertex crowns the arch peak!",
          },
        ],
        stepsUsed: 0,
        missesOnItem: 0,
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
        kind: meta.kind,
        worldId: meta.worldId,
        strand: meta.strand,
        encounterType: "rainbow_arch",
        title: meta.title,
        promptShort: askLanding ? "Find far landing pad x-root" : "Find arch symmetry midpoint x",
        equationText: camo ? `Bridge y = -(x - ${r2})(x - ${r1})` : `Bridge y = -(x - ${r1})(x - ${r2})`,
        targetLabel: "x",
        answer: askLanding ? r2 : mid,
        startDial: r1,
        detents: [-5, -1, 1, 5],
        isCamouflage: camo,
        isSimplified: simplified,
        archMeta: { a: -0.5, h: mid, k: (span * span) / 8, r1, r2 },
        beamActions: [
          {
            id: "zero_pads",
            label: `Roots land at ${r1}, ${r2}`,
            kind: "hint_transform",
            nextEquationText: askLanding ? `Far pad where (x - ${r2}) = 0` : `Midpoint = (${r1} + ${r2}) ÷ 2`,
            cue: "Factor zero marks landing pad!",
          },
        ],
        stepsUsed: 0,
        missesOnItem: 0,
        visualHint: askLanding ? `Lands at x = ${r2}` : `Peak centered at x = ${mid}`,
      };
    }

    case "quad_complete_sq": {
      const half = simplified ? randInt(2, 5, rng) : randInt(2, 7, rng);
      const bCoeff = 2 * half;
      const ans = half * half;
      return {
        uid,
        nodeId,
        kind: meta.kind,
        worldId: meta.worldId,
        strand: meta.strand,
        encounterType: "cryo_gate",
        title: meta.title,
        promptShort: "Fill corner slab to complete square",
        equationText: camo
          ? `x² - ${bCoeff}x + [?] = (x - ${half})²`
          : `x² + ${bCoeff}x + [?] = (x + ${half})²`,
        targetLabel: "Corner",
        answer: ans,
        startDial: bCoeff,
        detents: [-10, -5, -1, 1, 5, 10],
        isCamouflage: camo,
        isSimplified: simplified,
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
        stepsUsed: 0,
        missesOnItem: 0,
        visualHint: `(${bCoeff} ÷ 2)² = ${half}² = ${ans}`,
      };
    }

    case "exp_growth": {
      const a0 = pick([2, 3, 5], rng);
      const ratio = pick([2, 3], rng);
      const x = simplified ? 3 : randInt(3, 4, rng);
      const ans = a0 * Math.pow(ratio, x);
      return {
        uid,
        nodeId,
        kind: meta.kind,
        worldId: meta.worldId,
        strand: meta.strand,
        encounterType: "aurora_cascade",
        title: meta.title,
        promptShort: `Cascade ×${ratio} for ${x} stages`,
        equationText: camo ? `y = (${ratio}^${x}) · ${a0}` : `y = ${a0} · (${ratio}^${x})`,
        targetLabel: "Output",
        answer: ans,
        startDial: a0,
        detents: [-25, -5, -1, 1, 5, 25],
        isCamouflage: camo,
        isSimplified: simplified,
        growthMeta: { a0, ratio, x },
        beamActions: [
          {
            id: "step_mult",
            label: `Multiplier ${ratio}^${x} = ${Math.pow(ratio, x)}`,
            kind: "hint_transform",
            nextEquationText: `y = ${a0} × ${Math.pow(ratio, x)}`,
            cue: `Start at ${a0}, multiply ×${ratio}!`,
          },
        ],
        stepsUsed: 0,
        missesOnItem: 0,
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
        kind: meta.kind,
        worldId: meta.worldId,
        strand: meta.strand,
        encounterType: "aurora_cascade",
        title: meta.title,
        promptShort: `How many ×${base} stages reach ${target}?`,
        equationText: camo
          ? `${base}^n = ${target} → log_${base}(${target}) = ?`
          : `log_${base}(${target}) = stages  [${base}^n = ${target}]`,
        targetLabel: "Stages",
        answer: stage,
        startDial: 1,
        detents: [-1, 1],
        isCamouflage: camo,
        isSimplified: simplified,
        logMeta: { base, target, stage },
        beamActions: [
          {
            id: "count_chain",
            label: `Step powers of ${base}`,
            kind: "hint_transform",
            nextEquationText: Array.from({ length: stage }, (_, i) => Math.pow(base, i + 1)).join(" → "),
            cue: "Logs count the multiplier steps!",
          },
        ],
        stepsUsed: 0,
        missesOnItem: 0,
        visualHint: `${base}^${stage} = ${target} (${stage} stages)`,
      };
    }

    case "complex_i_rotation": {
      const isRealTarget = rng() < 0.7;
      const quarterTurns = isRealTarget ? pick([2, 4], rng) : pick([1, 3], rng);
      const startReal = isRealTarget
        ? pick([-12, -9, -8, -6, -5, -4, 3, 4, 5, 6, 8, 9, 12], rng)
        : pick([3, 4, 5, 6, 8, 10, 12], rng);
      const startAngleDeg = startReal >= 0 ? 0 : 180;
      const turnAngleDeg = quarterTurns * 90;
      const angleDeg = (startAngleDeg + turnAngleDeg) % 360;

      const endReal = quarterTurns === 2 ? -startReal : quarterTurns === 4 ? startReal : 0;
      const endImag = quarterTurns === 1 ? startReal : quarterTurns === 3 ? -startReal : 0;
      const iPower = quarterTurns === 1 ? "i" : quarterTurns === 2 ? "i²" : quarterTurns === 3 ? "i³" : "i⁴";
      const ans = isRealTarget ? endReal : endImag;
      const ruleText =
        quarterTurns === 2
          ? "Two 90° ×i turns spin 180° → i² = -1"
          : quarterTurns === 4
          ? "Four 90° ×i turns spin 360° → i⁴ = +1"
          : quarterTurns === 3
          ? "Three 90° ×i turns spin 270° → i³ = -i"
          : "One 90° ×i turn spins onto +i axis";

      const portalMeta = {
        startReal,
        startAngleDeg,
        quarterTurns,
        angleDeg,
        turnAngleDeg,
        endReal,
        endImag,
        iPower,
        isRealTarget,
        ruleText,
      };

      return {
        uid,
        nodeId,
        kind: meta.kind,
        worldId: meta.worldId,
        strand: meta.strand,
        encounterType: "astrolabe_shrine",
        title: meta.title,
        promptShort: isRealTarget
          ? `Spin ${quarterTurns} quarter-turns from ${startReal}`
          : `Dial i-axis after ${quarterTurns} turns`,
        equationText: isRealTarget
          ? camo
            ? `(${quarterTurns} × 90° turns) ${iPower} × (${startReal}) → Real = ?`
            : `${startReal} × ${iPower}  (${quarterTurns} × 90° turns) → Real = ?`
          : camo
          ? `(${quarterTurns} × 90° turns) ${iPower} × (${startReal}) → ?·i`
          : `${startReal} × ${iPower}  (${quarterTurns} × 90° turns) → ?·i`,
        targetLabel: isRealTarget ? "Real" : "i-Axis",
        answer: ans,
        startDial: 0,
        detents: [-10, -5, -1, 1, 5, 10],
        isCamouflage: camo,
        isSimplified: simplified,
        portalMeta,
        iPortalMeta: { ...portalMeta },
        complexMeta: { ...portalMeta },
        astrolabeMeta: { mode: "i_portal", given: startAngleDeg, target: angleDeg, quarterTurns },
        beamActions: [
          {
            id: "spin_quarter_turns",
            label:
              quarterTurns === 2
                ? "Spin 2×90°: i² = -1"
                : quarterTurns === 4
                ? "Spin 4×90°: i⁴ = +1"
                : quarterTurns === 3
                ? "Spin 3×90°: i³ = -i"
                : "Spin 1×90° onto +i",
            kind: "hint_transform",
            nextEquationText:
              quarterTurns === 2
                ? `${startReal} × (-1) = ?`
                : quarterTurns === 4
                ? `${startReal} × (+1) = ?`
                : quarterTurns === 3
                ? `(${startReal} × -1)·i = ?·i`
                : `(${startReal} × +1)·i = ?·i`,
            cue: "Every ×i spins 90° counterclockwise!",
          },
        ],
        stepsUsed: 0,
        missesOnItem: 0,
        visualHint: isRealTarget
          ? `${quarterTurns} quarter-turns (${iPower}) lands at ${ans}`
          : `${quarterTurns} quarter-turns (${iPower}) lands at ${ans}i`,
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
        kind: meta.kind,
        worldId: meta.worldId,
        strand: meta.strand,
        encounterType: "rainbow_arch",
        title: meta.title,
        promptShort: "Dial wave crest (midline + amp)",
        equationText: camo
          ? `Wave y = ${mid} + ${amp}·cos(x) → Max Crest?`
          : `Wave y = ${amp}·sin(x) + ${mid} → Max Crest?`,
        targetLabel: "Crest y",
        answer: ans,
        startDial: mid,
        detents: [-5, -1, 1, 5],
        isCamouflage: camo,
        isSimplified: simplified,
        archMeta: { a: -0.4, h: 4, k: ans, r1: 1, r2: 7, isWave: true },
        beamActions: [
          {
            id: "wave_peak",
            label: `Max ${camo ? "cos" : "sin"}=1: ${mid} + ${amp}`,
            kind: "hint_transform",
            nextEquationText: `Crest = ${mid} + ${amp}`,
            cue: "Crest rises amplitude above midline!",
          },
        ],
        stepsUsed: 0,
        missesOnItem: 0,
        visualHint: `Midline ${mid} + Amplitude ${amp} = ${ans}`,
      };
    }
  }
}

/**
 * Returns an interactive, animation-ready Spirit-Fox Holo-Projector Trick Card spec
 * for any encounter object, nodeId, or encounter `kind` string (all 29 kinds).
 * Guarantees: 2-3 visual beats, every `caption` <= 8 words, `foxWhisper` <= 8 words,
 * zero BANNED_CHILD_WORDS, and zero BANNED_CHILD_CURRICULUM_WORDS.
 */
function finiteOr(val, fallback) {
  if (
    val === null ||
    val === undefined ||
    typeof val === "boolean" ||
    typeof val === "object" ||
    typeof val === "symbol" ||
    typeof val === "function"
  ) {
    return fallback;
  }
  if (typeof val === "string" && val.trim() === "") return fallback;
  const n = Number(val);
  return Number.isFinite(n) && Math.abs(n) <= 1e12 ? (n === 0 ? 0 : n) : fallback;
}

function finiteNonZeroOr(val, fallback) {
  const n = finiteOr(val, fallback);
  return n !== 0 ? n : fallback;
}

export function getTrickCardSpec(encounterOrKind) {
  const enc =
    typeof encounterOrKind === "string"
      ? NODE_MAP[encounterOrKind]
        ? generateEncounter(encounterOrKind)
        : { kind: encounterOrKind }
      : encounterOrKind && typeof encounterOrKind === "object"
      ? encounterOrKind
      : {};

  const rawKind = typeof enc.kind === "string" && enc.kind ? enc.kind : NODE_MAP[enc.nodeId]?.kind || "eq_add";
  const kind = enc.isCamouflage && rawKind === "eq_twostep" ? "eq_twostep_camo" : rawKind;
  const ans = finiteOr(enc.answer, 6);

  switch (kind) {
    case "eq_add": {
      const leftA = finiteOr(enc.left?.a, 0);
      const a = leftA !== 0 ? finiteOr(enc.left?.b, 5) : finiteOr(enc.right?.b, 5);
      const rhs = ans + a;
      return {
        familyId: "eq_add",
        title: "Twin Tower Balance",
        foxWhisper: "Keep both crystal towers equal!",
        beats: [
          {
            caption: "Both towers hold matching total energy.",
            visualType: "balance_towers",
            visualProps: { leftVar: 1, leftConst: a, rightVar: 0, rightConst: rhs, phase: "start" },
          },
          {
            caption: `Zap ${a} gold blocks off both sides.`,
            visualType: "balance_towers",
            visualProps: { zapConst: -a, leftConstAfter: 0, rightConstAfter: ans, phase: "zap" },
          },
          {
            caption: `Remaining blocks reveal n = ${ans}!`,
            visualType: "balance_towers",
            visualProps: { solvedVar: "n", answer: ans, phase: "solved" },
          },
        ],
      };
    }

    case "eq_cross_zero": {
      const leftA = finiteOr(enc.left?.a, 0);
      const a = leftA !== 0 ? finiteOr(enc.left?.b, 10) : finiteOr(enc.right?.b, 10);
      const rhs = ans + a;
      return {
        familyId: "eq_cross_zero",
        title: "Zero-Pair Melt",
        foxWhisper: "Fire and frost cancel to zero!",
        beats: [
          {
            caption: `Start with n plus ${a} warm blocks.`,
            visualType: "zero_pair_cauldron",
            visualProps: { warm: a, targetTotal: rhs, phase: "setup" },
          },
          {
            caption: `Add -${a} frost to both sides.`,
            visualType: "zero_pair_cauldron",
            visualProps: { warm: rhs, frost: -a, zeroPairs: Math.max(0, rhs), phase: "annihilate" },
          },
          {
            caption: `Past zero lands at ${ans}!`,
            visualType: "zero_pair_cauldron",
            visualProps: { answer: ans, phase: "result" },
          },
        ],
      };
    }

    case "eq_subzero_extreme": {
      const leftA = finiteOr(enc.left?.a, 0);
      const k1 = leftA !== 0 ? finiteOr(enc.left?.b, 100) : finiteOr(enc.right?.b, 100);
      const rhs = leftA !== 0 ? finiteOr(enc.right?.b, -100) : finiteOr(enc.left?.b, -100);
      return {
        familyId: "eq_subzero_extreme",
        title: "Deep Sub-Zero Balance",
        foxWhisper: "Combine right side, then drop deeper!",
        beats: [
          {
            caption: `Right tower settles at ${rhs} first.`,
            visualType: "zero_pair_cauldron",
            visualProps: { leftConst: k1, rightNet: rhs, phase: "combine_rhs" },
          },
          {
            caption: `Zap ${k1} from both crystal towers.`,
            visualType: "zero_pair_cauldron",
            visualProps: { rightNet: rhs, zap: -k1, phase: "subzero_drop" },
          },
          {
            caption: `Dive deep to n = ${ans}!`,
            visualType: "zero_pair_cauldron",
            visualProps: { answer: ans, phase: "result" },
          },
        ],
      };
    }

    case "int_double_neg": {
      const base = finiteOr(enc.startDial, 10);
      const lift = Math.max(1, ans - base);
      return {
        familyId: "int_double_neg",
        title: "Frost Vacuum Lift",
        foxWhisper: "Pulling out frost warms the cauldron!",
        beats: [
          {
            caption: `Cauldron starts at level ${base}.`,
            visualType: "zero_pair_cauldron",
            visualProps: { startTemp: base, frostRemoved: lift, phase: "start" },
          },
          {
            caption: `Vacuum pulls out ${lift} cold frost-weights.`,
            visualType: "zero_pair_cauldron",
            visualProps: { startTemp: base, frostRemoved: lift, phase: "vacuum_frost" },
          },
          {
            caption: `Minus negative ${lift} lifts +${lift} higher!`,
            visualType: "zero_pair_cauldron",
            visualProps: { startTemp: base, delta: lift, answer: ans, phase: "lifted" },
          },
        ],
      };
    }

    case "int_polarity": {
      const eqStr = typeof enc.equationText === "string" ? enc.equationText : "";
      const mMatch = eqStr.match(/\((-?\d+)\)\s*×\s*\((-?\d+)\)/);
      const a = finiteNonZeroOr(enc.polarityMeta?.a, mMatch ? finiteNonZeroOr(mMatch[1], -3) : -3);
      const b = finiteNonZeroOr(enc.polarityMeta?.b, mMatch ? finiteNonZeroOr(mMatch[2], -5) : -5);
      const absA = Math.abs(a);
      const absB = Math.abs(b);
      const absProd = absA * absB;
      return {
        familyId: "int_polarity",
        title: "Polarity Mirror Flip",
        foxWhisper: "Each minus sign flips 180 degrees!",
        beats: [
          {
            caption: `Size first: ${absA} × ${absB} = ${absProd}.`,
            visualType: "polarity_mirror",
            visualProps: { groups: absA, size: absB, magnitude: absProd, flips: 0 },
          },
          {
            caption: b < 0 ? "First minus flips; second flips positive!" : "One minus flips beam into sub-zero!",
            visualType: "polarity_mirror",
            visualProps: { flips: b < 0 ? 2 : 1, angleDeg: b < 0 ? 360 : 180 },
          },
          {
            caption: `Beam locks onto ${ans}!`,
            visualType: "polarity_mirror",
            visualProps: { answer: ans, sign: ans >= 0 ? "+" : "-" },
          },
        ],
      };
    }

    case "seq_linear": {
      const pm = enc.patternMeta && typeof enc.patternMeta === "object" ? enc.patternMeta : {};
      const b = finiteOr(pm.baseCount, finiteOr(pm.b, 3));
      const m = finiteOr(pm.stepGrowth, finiteOr(pm.m, 4));
      const k = Math.max(1, Math.round(finiteOr(pm.targetStep, 10)));
      const total = b + k * m;
      const frames =
        Array.isArray(pm.frames) && pm.frames.length > 0
          ? pm.frames.slice(0, 6).map((fr, idx) => {
              const step = Math.max(1, Math.round(finiteOr(fr?.step, idx + 1)));
              const base = finiteOr(fr?.base, b);
              const groups = Math.max(1, Math.round(finiteOr(fr?.groups, step)));
              const perGroup = finiteOr(fr?.perGroup, m);
              return { step, base, groups, perGroup, total: finiteOr(fr?.total, base + groups * perGroup) };
            })
          : undefined;
      return {
        familyId: "seq_linear",
        title: "Base Stones + Growing Rows",
        foxWhisper: "Base stays fixed; rows grow!",
        beats: [
          {
            caption: `${b} gold base stones never change.`,
            visualType: "crystal_frames",
            visualProps: { baseCount: b, stepGrowth: m, highlight: "base", frames },
          },
          {
            caption: `Each frame adds ${m} new crystals.`,
            visualType: "crystal_frames",
            visualProps: { baseCount: b, stepGrowth: m, highlight: "groups", frames },
          },
          {
            caption: `Frame ${k}: ${b} + ${k}×${m} = ${total}!`,
            visualType: "crystal_frames",
            visualProps: { baseCount: b, stepGrowth: m, targetStep: k, answer: total, highlight: "rule" },
          },
        ],
      };
    }

    case "expr_distribute": {
      const a = finiteNonZeroOr(enc.towers?.leftA, 3);
      const ab = finiteOr(enc.towers?.leftB, 6);
      const b = finiteOr(Math.round(ab / a), 2);
      const nVal = finiteOr(Math.round(ans / a - b), 2);
      const signCompact = b >= 0 ? `+${b}` : `-${Math.abs(b)}`;
      return {
        familyId: "expr_distribute",
        title: "Unpack Matching Crystal Rows",
        foxWhisper: "Every row copies the whole group!",
        beats: [
          {
            caption: `Build ${a} matching rows of n${signCompact}.`,
            visualType: "array_grid",
            visualProps: { rows: a, nVal, innerConst: b, phase: "rows" },
          },
          {
            caption: `Plug n = ${nVal} inside one row.`,
            visualType: "array_grid",
            visualProps: { rows: a, rowSum: nVal + b, phase: "single_row" },
          },
          {
            caption: `Multiply ${a} rows to reach ${ans}!`,
            visualType: "array_grid",
            visualProps: { rows: a, rowSum: nVal + b, answer: ans, phase: "total" },
          },
        ],
      };
    }

    case "exp_power": {
      const eqStr = typeof enc.equationText === "string" ? enc.equationText : "";
      const pMatch = eqStr.match(/(\d+)\^(\d+)/);
      const rawBase = finiteNonZeroOr(enc.powerMeta?.base, pMatch ? finiteNonZeroOr(pMatch[1], 2) : 2);
      const base = Math.max(-20, Math.min(20, Math.round(rawBase))) || 2;
      const rawExp = finiteOr(enc.powerMeta?.exp, pMatch ? finiteOr(pMatch[2], 3) : 3);
      const exp = Math.max(1, Math.min(8, Math.round(rawExp)));
      return {
        familyId: "exp_power",
        title: "Power Tower Multiplier",
        foxWhisper: "Exponents multiply stage after stage!",
        beats: [
          {
            caption: `Careful: ${base}^${exp} is NOT ${base}×${exp}!`,
            visualType: "power_cascade",
            visualProps: { base, stages: exp, notProduct: base * exp, phase: "contrast" },
          },
          {
            caption: `Chain ${exp} stages of ×${base} growth.`,
            visualType: "power_cascade",
            visualProps: {
              base,
              stages: exp,
              chain: Array.from({ length: exp }, (_, i) => Math.pow(base, i + 1)),
              phase: "chain",
            },
          },
          {
            caption: `Tower charges up to ${ans}!`,
            visualType: "power_cascade",
            visualProps: { base, stages: exp, answer: ans, phase: "charged" },
          },
        ],
      };
    }

    case "geo_parallel_angles": {
      const am = enc.astrolabeMeta && typeof enc.astrolabeMeta === "object" ? enc.astrolabeMeta : {};
      const mode = am.mode === "supp" ? "supp" : "alt";
      const given = finiteOr(am.given, 65);
      return {
        familyId: "geo_parallel_angles",
        title: "Parallel Mirror Beams",
        foxWhisper: "Z-corners match; straight lines make 180°!",
        beats: [
          {
            caption: "Twin mirror rails run dead-even.",
            visualType: "angle_astrolabe",
            visualProps: { mode, given, phase: "rails" },
          },
          {
            caption: mode === "alt" ? "Z-corners bounce at equal angles." : "Two angles share a 180° line.",
            visualType: "angle_astrolabe",
            visualProps: { mode, given, total: 180, phase: "relation" },
          },
          {
            caption: `Mirror locks cleanly at ${ans}°!`,
            visualType: "angle_astrolabe",
            visualProps: { mode, given, answer: ans, phase: "locked" },
          },
        ],
      };
    }

    case "eq_twostep": {
      const absA = Math.abs(finiteNonZeroOr(enc.left?.a, finiteNonZeroOr(enc.right?.a, 2)));
      const safeLeft = { a: finiteOr(enc.left?.a, 2), b: finiteOr(enc.left?.b, 4) };
      const safeRight = { a: finiteOr(enc.right?.a, 0), b: finiteOr(enc.right?.b, safeLeft.a * ans + safeLeft.b) };
      return {
        familyId: "eq_twostep",
        title: "Two-Beam Tower Unlock",
        foxWhisper: "Clear loose blocks, then split cores!",
        beats: [
          {
            caption: "Clear loose gold or frost blocks.",
            visualType: "balance_towers",
            visualProps: { left: safeLeft, right: safeRight, phase: "zap_const" },
          },
          {
            caption: `Split remaining total across ${absA} cores.`,
            visualType: "balance_towers",
            visualProps: { divisor: absA, total: absA * ans, phase: "split" },
          },
          {
            caption: `Each n-core holds ${ans}!`,
            visualType: "balance_towers",
            visualProps: { solvedVar: "n", answer: ans, phase: "solved" },
          },
        ],
      };
    }

    case "eq_twostep_camo": {
      const b = finiteOr(enc.right?.b, 14);
      const absA = Math.abs(finiteNonZeroOr(enc.right?.a, -2));
      const leftB = finiteOr(enc.left?.b, 6);
      return {
        familyId: "eq_twostep_camo",
        title: "Camouflage Like-Term Shield",
        foxWhisper: "Gold cubes and n-cores never mix!",
        beats: [
          {
            caption: `Blocks ${b} and -${absA}n magnetically repel!`,
            visualType: "camo_repel",
            visualProps: { constB: b, coeffA: -absA, repel: true, phase: "repel" },
          },
          {
            caption: `Zap ${b} constant blocks from both sides.`,
            visualType: "camo_repel",
            visualProps: { constB: b, coeffA: -absA, lhsAfter: leftB - b, phase: "zap_b" },
          },
          {
            caption: `Divide by -${absA} to flip sign!`,
            visualType: "camo_repel",
            visualProps: { coeffA: -absA, answer: ans, phase: "flip_divide" },
          },
        ],
      };
    }

    case "eq_parens": {
      const a = finiteNonZeroOr(enc.left?.grouped?.factor, finiteNonZeroOr(enc.left?.a, 3));
      const rhs = finiteOr(enc.right?.b, a * (ans + 2));
      return {
        familyId: "eq_parens",
        title: "Prism Group Shortcut",
        foxWhisper: "Split equal groups before unpacking!",
        beats: [
          {
            caption: `${a} identical bundles total ${rhs} energy.`,
            visualType: "array_grid",
            visualProps: { groups: a, total: rhs, phase: "bundles" },
          },
          {
            caption: `Divide both sides by ${a} first!`,
            visualType: "array_grid",
            visualProps: { groups: a, perBundle: finiteOr(rhs / a, ans + 2), phase: "split_bundles" },
          },
          {
            caption: `Solve one bundle for n = ${ans}!`,
            visualType: "array_grid",
            visualProps: { answer: ans, phase: "solved" },
          },
        ],
      };
    }

    case "eq_both_sides": {
      const safeLeft = { a: finiteOr(enc.left?.a, 5), b: finiteOr(enc.left?.b, 2) };
      const safeRight = { a: finiteOr(enc.right?.a, 2), b: finiteOr(enc.right?.b, 3 * ans + 2) };
      return {
        familyId: "eq_both_sides",
        title: "Twin-Tower Core Sweep",
        foxWhisper: "Gather all n-cores onto one tower!",
        beats: [
          {
            caption: "Zap matching n-cores off both towers.",
            visualType: "balance_towers",
            visualProps: { left: safeLeft, right: safeRight, phase: "zap_vars" },
          },
          {
            caption: "Clear constant blocks onto opposite tower.",
            visualType: "balance_towers",
            visualProps: { left: safeLeft, right: safeRight, phase: "zap_consts" },
          },
          {
            caption: `Split cleanly to find n = ${ans}!`,
            visualType: "balance_towers",
            visualProps: { solvedVar: "n", answer: ans, phase: "solved" },
          },
        ],
      };
    }

    case "geo_scale_area": {
      const eqStr = typeof enc.equationText === "string" ? enc.equationText : "";
      const sMatch = eqStr.match(/=\s*(\d+)\s*m².*k\s*=\s*(\d+)/);
      const baseArea = finiteOr(enc.scaleMeta?.baseArea, sMatch ? finiteOr(sMatch[1], 4) : 4);
      const k = finiteNonZeroOr(enc.scaleMeta?.k, sMatch ? finiteNonZeroOr(sMatch[2], 3) : 3);
      const kSq = k * k;
      return {
        familyId: "geo_scale_area",
        title: "Square-Grid Sail Scaling",
        foxWhisper: "Width and height both multiply!",
        beats: [
          {
            caption: `Stretching ${k}× widens AND heightens sails.`,
            visualType: "array_grid",
            visualProps: { scaleK: k, baseArea, phase: "axes" },
          },
          {
            caption: `Tiles multiply by ${k}×${k} = ${kSq}!`,
            visualType: "array_grid",
            visualProps: { scaleK: k, tileCount: kSq, phase: "grid" },
          },
          {
            caption: `Base ${baseArea} × ${kSq} makes ${ans}!`,
            visualType: "array_grid",
            visualProps: { baseArea, tileCount: kSq, answer: ans, phase: "total" },
          },
        ],
      };
    }

    case "ramp_slope_only": {
      const rm = enc.rampMeta && typeof enc.rampMeta === "object" ? enc.rampMeta : {};
      const run = finiteNonZeroOr(rm.targetX, 4);
      const rise = finiteOr(rm.targetY, ans * run);
      return {
        familyId: "ramp_slope_only",
        title: "Rise Over Run Stairs",
        foxWhisper: "Slope climbs height per forward step!",
        beats: [
          {
            caption: `Ring sits ${run}m forward, ${rise}m vertical.`,
            visualType: "slope_stairs",
            visualProps: { run, rise, b: 0, phase: "target" },
          },
          {
            caption: `Divide vertical rise ${rise} by run ${run}.`,
            visualType: "slope_stairs",
            visualProps: { run, rise, m: ans, phase: "ratio" },
          },
          {
            caption: `Each 1m forward steps ${ans}m!`,
            visualType: "slope_stairs",
            visualProps: { unitStep: ans, answer: ans, phase: "unit_stair" },
          },
        ],
      };
    }

    case "ramp_linear": {
      const rm = enc.rampMeta && typeof enc.rampMeta === "object" ? enc.rampMeta : {};
      const b = finiteOr(rm.b, 3);
      const targetX = finiteNonZeroOr(rm.targetX, 4);
      const targetY = finiteOr(rm.targetY, ans * targetX + b);
      return {
        familyId: "ramp_linear",
        title: "Pad Lift + Canyon Slope",
        foxWhisper: "Start at pad b, then climb!",
        beats: [
          {
            caption: `Launch pad already starts at height ${b}.`,
            visualType: "slope_stairs",
            visualProps: { b, targetX, targetY, phase: "pad_lift" },
          },
          {
            caption: `Remaining climb is ${targetY} minus ${b}.`,
            visualType: "slope_stairs",
            visualProps: { b, deltaY: targetY - b, targetX, phase: "delta_y" },
          },
          {
            caption: `Divide climb by ${targetX}m for slope ${ans}!`,
            visualType: "slope_stairs",
            visualProps: { deltaY: targetY - b, run: targetX, answer: ans, phase: "slope" },
          },
        ],
      };
    }

    case "ramp_point_target": {
      const rm = enc.rampMeta && typeof enc.rampMeta === "object" ? enc.rampMeta : {};
      const m = finiteOr(rm.m, 2);
      const targetX = finiteNonZeroOr(rm.targetX, 4);
      const climb = m * targetX;
      const targetY = finiteOr(rm.targetY, climb + ans);
      return {
        familyId: "ramp_point_target",
        title: "Tune Launch Pad Lift",
        foxWhisper: "Backtrack from ring using slope climb!",
        beats: [
          {
            caption: `Slope ${m} climbs ${climb}m over ${targetX}m.`,
            visualType: "slope_stairs",
            visualProps: { m, climb, targetX, phase: "climb" },
          },
          {
            caption: `Ring waits at height ${targetY}m.`,
            visualType: "slope_stairs",
            visualProps: { targetY, climb, phase: "ring" },
          },
          {
            caption: `Set pad lift b to ${ans}!`,
            visualType: "slope_stairs",
            visualProps: { b: ans, answer: ans, phase: "pad_set" },
          },
        ],
      };
    }

    case "sys_intersection": {
      const rm = enc.rampMeta && typeof enc.rampMeta === "object" ? enc.rampMeta : {};
      const m1 = finiteOr(rm.m, 3);
      const b1 = finiteOr(rm.b, 1);
      const m2 = finiteOr(rm.m2, 1);
      const b2 = finiteOr(rm.b2, 7);
      const meetY = finiteOr(rm.targetY, m1 * ans + b1);
      return {
        familyId: "sys_intersection",
        title: "Dual-Rig Crossing Point",
        foxWhisper: "Rigs meet where heights match!",
        beats: [
          {
            caption: "Both rigs share equal y at crossing.",
            visualType: "slope_stairs",
            visualProps: { m1, b1, m2, b2, isSystem: true, phase: "paths" },
          },
          {
            caption: "Zap smaller x-slope from both equations.",
            visualType: "slope_stairs",
            visualProps: { diffM: m1 - m2, isSystem: true, phase: "gap" },
          },
          {
            caption: `Paths cross cleanly at x = ${ans}!`,
            visualType: "slope_stairs",
            visualProps: { meetX: ans, meetY, answer: ans, isSystem: true, phase: "meet" },
          },
        ],
      };
    }

    case "geo_triangle_truss": {
      const am = enc.astrolabeMeta && typeof enc.astrolabeMeta === "object" ? enc.astrolabeMeta : {};
      const a1 = finiteOr(am.a1, 55);
      const a2 = finiteOr(am.a2, 65);
      return {
        familyId: "geo_triangle_truss",
        title: "180° Crystal Truss Lock",
        foxWhisper: "Three truss corners fold to 180°!",
        beats: [
          {
            caption: "Three corners snap into one straight line.",
            visualType: "angle_astrolabe",
            visualProps: { a1, a2, total: 180, mode: "truss", phase: "fold" },
          },
          {
            caption: `Add known corners: ${a1}° + ${a2}° = ${a1 + a2}°.`,
            visualType: "angle_astrolabe",
            visualProps: { a1, a2, sumKnown: a1 + a2, mode: "truss", phase: "sum" },
          },
          {
            caption: `Subtract from 180° to lock ${ans}°!`,
            visualType: "angle_astrolabe",
            visualProps: { sumKnown: a1 + a2, answer: ans, mode: "truss", phase: "locked" },
          },
        ],
      };
    }

    case "geo_astrolabe_thales": {
      const alpha = finiteOr(enc.astrolabeMeta?.alpha, 90 - ans);
      return {
        familyId: "geo_astrolabe_thales",
        title: "Semicircle 90° Star-Ring",
        foxWhisper: "Any rim point on diameter makes 90°!",
        beats: [
          {
            caption: "Diameter beam spans straight through center.",
            visualType: "angle_astrolabe",
            visualProps: { mode: "thales", peakAngle: 90, phase: "diameter" },
          },
          {
            caption: "Rim peak automatically locks at 90°!",
            visualType: "angle_astrolabe",
            visualProps: { mode: "thales", peakAngle: 90, alpha, phase: "right_peak" },
          },
          {
            caption: `90° minus ${alpha}° gives ${ans}°!`,
            visualType: "angle_astrolabe",
            visualProps: { mode: "thales", alpha, answer: ans, phase: "partner" },
          },
        ],
      };
    }

    case "geo_pythagoras": {
      const hm = enc.harpoonMeta && typeof enc.harpoonMeta === "object" ? enc.harpoonMeta : {};
      const legA = finiteOr(hm.legA, 3);
      const legB = finiteOr(hm.legB, 4);
      const hyp = finiteOr(hm.hyp, ans);
      return {
        familyId: "geo_pythagoras",
        title: "Three-Square Harpoon Law",
        foxWhisper: "Two leg squares fill cable square!",
        beats: [
          {
            caption: `Square both legs: ${legA}² + ${legB}².`,
            visualType: "right_triangle_squares",
            visualProps: { legA, legB, sqA: legA * legA, sqB: legB * legB, phase: "legs" },
          },
          {
            caption: `Combine ${legA * legA} + ${legB * legB} into ${hyp * hyp}.`,
            visualType: "right_triangle_squares",
            visualProps: { sqA: legA * legA, sqB: legB * legB, sqC: hyp * hyp, phase: "merge_squares" },
          },
          {
            caption: `Square root gives ${ans}m harpoon cable!`,
            visualType: "right_triangle_squares",
            visualProps: { sqC: hyp * hyp, answer: ans, phase: "cable" },
          },
        ],
      };
    }

    case "geo_trig_ratio": {
      const eqStr = typeof enc.equationText === "string" ? enc.equationText : "";
      const angMatch = eqStr.match(/Angle\s*(\d+)°.*=\s*([\d.]+)\).*Span\s*(\d+)m/);
      const angle = finiteOr(enc.ratioMeta?.angle, angMatch ? finiteOr(angMatch[1], 30) : 30);
      const mult = finiteOr(enc.ratioMeta?.mult, angMatch ? finiteOr(angMatch[2], 0.5) : 0.5);
      const span = finiteOr(enc.ratioMeta?.span, angMatch ? finiteOr(angMatch[3], 20) : finiteOr(enc.harpoonMeta?.hyp, 20));
      return {
        familyId: "starlight_angle_ratio",
        title: "Starlight Angle Ratio",
        foxWhisper: "Fixed angle locks side ratio!",
        beats: [
          {
            caption: "Matching angles build scaled twin frames.",
            visualType: "right_triangle_squares",
            visualProps: { angle, ratio: mult, phase: "similar" },
          },
          {
            caption: `At ${angle}°, scale span ${span}m by ${mult}!`,
            visualType: "right_triangle_squares",
            visualProps: { angle, span, ratio: mult, phase: "scale" },
          },
          {
            caption: `Beam locks target at ${ans}m!`,
            visualType: "right_triangle_squares",
            visualProps: { span, ratio: mult, answer: ans, phase: "locked" },
          },
        ],
      };
    }

    case "arch_vertex_eval": {
      const am = enc.archMeta && typeof enc.archMeta === "object" ? enc.archMeta : {};
      const a = finiteNonZeroOr(am.a, -1);
      const h = finiteOr(am.h, 3);
      const k = finiteOr(am.k, 12);
      const askPeak = ans === k;
      return {
        familyId: "arch_vertex_eval",
        title: "Rainbow Arch Crown",
        foxWhisper: "Peak sits where squared part vanishes!",
        beats: [
          {
            caption: `At x = ${h}, (x-${h})² becomes zero.`,
            visualType: "parabola_arch",
            visualProps: { a, h, k, phase: "zero_square" },
          },
          {
            caption: `Arch crowns at peak (${h}, ${k}).`,
            visualType: "parabola_arch",
            visualProps: { h, k, phase: "vertex" },
          },
          {
            caption: askPeak ? `Peak height equals k = ${k}!` : `Plug x into arch for ${ans}!`,
            visualType: "parabola_arch",
            visualProps: { h, k, answer: ans, phase: "eval" },
          },
        ],
      };
    }

    case "arch_roots": {
      const am = enc.archMeta && typeof enc.archMeta === "object" ? enc.archMeta : {};
      const r1 = finiteOr(am.r1, 2);
      const r2 = finiteOr(am.r2, 8);
      const askLanding = ans === r2;
      return {
        familyId: "arch_roots",
        title: "Twin Landing Pads",
        foxWhisper: "Zero factors mark both bridge pads!",
        beats: [
          {
            caption: `Bridge touches ground at ${r1} and ${r2}.`,
            visualType: "parabola_arch",
            visualProps: { r1, r2, midpoint: (r1 + r2) / 2, phase: "pads" },
          },
          {
            caption: "Peak balances halfway between landing pads.",
            visualType: "parabola_arch",
            visualProps: { r1, r2, midpoint: (r1 + r2) / 2, phase: "symmetry" },
          },
          {
            caption: askLanding ? `Far pad sits at x = ${r2}!` : `Midpoint sits at x = ${ans}!`,
            visualType: "parabola_arch",
            visualProps: { r1, r2, answer: ans, phase: "target" },
          },
        ],
      };
    }

    case "quad_complete_sq": {
      const bCoeff = finiteOr(enc.towers?.leftB, 6);
      const half = Math.round(bCoeff / 2);
      return {
        familyId: "quad_complete_sq",
        title: "3D Mosaic Corner Forge",
        foxWhisper: "Halve the side bars, then square!",
        beats: [
          {
            caption: `Split ${bCoeff}x bar into two ${half}x wings.`,
            visualType: "mosaic_square",
            visualProps: { bCoeff, half, phase: "split_wings" },
          },
          {
            caption: "Place wings along x² crystal slab.",
            visualType: "mosaic_square",
            visualProps: { half, phase: "l_frame" },
          },
          {
            caption: `Corner socket needs ${half}×${half} = ${ans}!`,
            visualType: "mosaic_square",
            visualProps: { half, cornerArea: ans, answer: ans, phase: "seal_corner" },
          },
        ],
      };
    }

    case "exp_growth": {
      const eqStr = typeof enc.equationText === "string" ? enc.equationText : "";
      const eMatch = eqStr.match(/=\s*(\d+)\s*·\s*\((\d+)\^(\d+)\)/);
      const a0 = finiteOr(enc.growthMeta?.a0, eMatch ? finiteOr(eMatch[1], 3) : 3);
      const rawRatio = finiteNonZeroOr(enc.growthMeta?.ratio, eMatch ? finiteNonZeroOr(eMatch[2], 2) : 2);
      const ratio = Math.max(-20, Math.min(20, Math.round(rawRatio))) || 2;
      const rawX = finiteOr(enc.growthMeta?.x, eMatch ? finiteOr(eMatch[3], 3) : 3);
      const x = Math.max(1, Math.min(8, Math.round(rawX)));
      const mult = Math.pow(ratio, x);
      return {
        familyId: "exp_growth",
        title: "Cascade Multiplier Chain",
        foxWhisper: "Start at seed, multiply every stage!",
        beats: [
          {
            caption: `Seed crystal starts with ${a0} energy.`,
            visualType: "power_cascade",
            visualProps: { seed: a0, ratio, stages: x, phase: "seed" },
          },
          {
            caption: `Multiply ×${ratio} across ${x} cascade stages.`,
            visualType: "power_cascade",
            visualProps: { seed: a0, ratio, stages: x, multiplier: mult, phase: "cascade" },
          },
          {
            caption: `${a0} × ${mult} surges to ${ans}!`,
            visualType: "power_cascade",
            visualProps: { seed: a0, multiplier: mult, answer: ans, phase: "total" },
          },
        ],
      };
    }

    case "log_stage": {
      const eqStr = typeof enc.equationText === "string" ? enc.equationText : "";
      const lMatch = eqStr.match(/log_(\d+)\((\d+)\)/);
      const base = finiteNonZeroOr(enc.logMeta?.base, lMatch ? finiteNonZeroOr(lMatch[1], 2) : 2);
      const target = finiteOr(enc.logMeta?.target, lMatch ? finiteOr(lMatch[2], 8) : 8);
      return {
        familyId: "log_stage",
        title: "Stage Counter Dial",
        foxWhisper: "Count how many multiplier steps reach target!",
        beats: [
          {
            caption: `Each stage multiplies energy by ×${base}.`,
            visualType: "power_cascade",
            visualProps: { base, target, phase: "step_rule" },
          },
          {
            caption: `Step ×${base} until reaching ${target}.`,
            visualType: "power_cascade",
            visualProps: { base, target, steps: ans, phase: "count_steps" },
          },
          {
            caption: `It takes ${ans} stages to arrive!`,
            visualType: "power_cascade",
            visualProps: { base, target, answer: ans, phase: "arrived" },
          },
        ],
      };
    }

    case "complex_i_rotation": {
      const pm = enc.portalMeta && typeof enc.portalMeta === "object" ? enc.portalMeta : {};
      const startReal = finiteOr(pm.startReal, 5);
      const qt = Math.max(1, Math.min(4, Math.round(finiteOr(pm.quarterTurns, 2))));
      const startAngleDeg = finiteOr(pm.startAngleDeg, startReal >= 0 ? 0 : 180);
      const isRealTarget = typeof pm.isRealTarget === "boolean" ? pm.isRealTarget : qt % 2 === 0;
      return {
        familyId: "complex_i_rotation",
        title: "90° Quarter-Turn i-Portal",
        foxWhisper: "Each i-portal spins beam 90 degrees!",
        beats: [
          {
            caption: `Beam starts at ${startReal} on east-west line.`,
            visualType: "quarter_turn_portal",
            visualProps: { startReal, quarterTurns: 0, angleDeg: startAngleDeg, phase: "start" },
          },
          {
            caption:
              qt === 2
                ? "Two 90° turns flip 180° opposite!"
                : qt === 4
                ? "Four 90° turns spin full 360°!"
                : "Each ×i spins 90° counterclockwise!",
            visualType: "quarter_turn_portal",
            visualProps: { startReal, quarterTurns: qt, turnAngleDeg: qt * 90, phase: "spin" },
          },
          {
            caption: `${qt} turns land squarely at ${ans}!`,
            visualType: "quarter_turn_portal",
            visualProps: { startReal, quarterTurns: qt, answer: ans, isRealTarget, phase: "landed" },
          },
        ],
      };
    }

    case "trig_wave_crest":
    default: {
      const mid = finiteOr(enc.startDial, 4);
      const amp = Math.max(1, ans - mid);
      return {
        familyId: "aurora_wave_crest",
        title: "Aurora Wave Crest",
        foxWhisper: "Crest equals midline height plus wave swing!",
        beats: [
          {
            caption: `Calm sea midline rests at ${mid}.`,
            visualType: "parabola_arch",
            visualProps: { midline: mid, amplitude: amp, isWave: true, phase: "midline" },
          },
          {
            caption: `Wave swings +${amp} above midline.`,
            visualType: "parabola_arch",
            visualProps: { midline: mid, amplitude: amp, isWave: true, phase: "swing" },
          },
          {
            caption: `Crest peaks at ${mid}+${amp} = ${ans}!`,
            visualType: "parabola_arch",
            visualProps: { midline: mid, amplitude: amp, answer: ans, isWave: true, phase: "crest" },
          },
        ],
      };
    }
  }
}

/**
 * Computes Zone Clear, Per-Node Stars (0..3), & Guardian Awakening progress for HUD + Portal Hub.
 * 100% aligned with `unlockFrontierWorlds(progress)` (2 solid stage>=2 beacons unlock next Rank).
 */
export function computeWorldProgress(progress, worldId = null) {
  const targetId = worldId || progress?.activeWorld || "W1";
  const world = WORLDS.find((w) => w.id === targetId) || WORLDS[1];
  const nextWorld = WORLDS[world.index + 1] || null;

  const nodeStatuses = world.nodes.map((n) => {
    const rawStage = progress?.nodes?.[n.id]?.stage || 0;
    const stage = Math.max(0, Math.min(3, Math.floor(rawStage)));
    return {
      nodeId: n.id,
      name: n.title,
      stars: stage,
      stage,
    };
  });

  const beaconsTotal = world.nodes.length;
  const solidCount = nodeStatuses.filter((ns) => ns.stage >= 2).length;
  const beaconsLit =
    world.id === "W0"
      ? progress?.calibrated
        ? beaconsTotal
        : Math.min(beaconsTotal, Math.max(solidCount, progress?.calibrationStep || 0))
      : solidCount;
  const beaconsNeededForUnlock = world.id === "W0" ? beaconsTotal : Math.min(2, beaconsTotal);

  const starsEarned = nodeStatuses.reduce((sum, ns) => sum + ns.stars, 0);
  const starsMax = beaconsTotal * 3;
  const completionPct = beaconsTotal > 0 ? Math.round((beaconsLit / beaconsTotal) * 100) : 0;
  const guardianAwakened =
    world.id === "W0"
      ? Boolean(progress?.calibrated || beaconsLit >= beaconsNeededForUnlock)
      : beaconsLit >= beaconsNeededForUnlock;

  return {
    worldId: world.id,
    rankLabel: world.rankLabel,
    worldName: world.name,
    guardianName: world.guardianName,
    beaconsLit,
    beaconsTotal,
    beaconsNeededForUnlock,
    starsEarned,
    starsMax,
    completionPct,
    guardianAwakened,
    nextWorldId: nextWorld ? nextWorld.id : null,
    nextWorldRankLabel: nextWorld ? nextWorld.rankLabel : null,
    nextWorldName: nextWorld ? nextWorld.name : null,
    nodeStatuses,
  };
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
  if (right.grouped) {
    const { factor, innerB } = right.grouped;
    actions.push({
      id: "unpack_group",
      label: `Unpack ${factor}(...)`,
      kind: "sym_step",
      nextLeft: { ...left },
      nextRight: { a: factor, b: factor * innerB },
      nextEquationText: `${formatLinearExpr(left.a, left.b, varSymbol)} = ${formatLinearExpr(factor, factor * innerB, varSymbol)}`,
      cue: "Prism unpacked across blocks!",
    });
    return actions;
  }

  if (left.a !== 0 && right.a !== 0) {
    const zapA = Math.abs(left.a) <= Math.abs(right.a) ? left.a : right.a;
    const nl = { a: normZero(left.a - zapA), b: left.b };
    const nr = { a: normZero(right.a - zapA), b: right.b };
    const verb =
      zapA > 0
        ? `Zap -${zapA === 1 ? "" : zapA}${varSymbol} both`
        : `Add +${Math.abs(zapA) === 1 ? "" : Math.abs(zapA)}${varSymbol} both`;
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
    const nl = { a: left.a, b: normZero(left.b - k) };
    const nr = { a: right.a, b: normZero(right.b - k) };
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
    const nl = { a: normZero(left.a / div), b: normZero(left.b / div) };
    const nr = { a: normZero(right.a / div), b: normZero(right.b / div) };
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
  isSimplified = false,
  encounterOverride = null,
  rampMeta = undefined,
}) {
  const initialBeamActions = buildBeamActionsForLinear(left, right, varSymbol);
  const cleanLeft = { ...left, ...(left.grouped ? { grouped: { ...left.grouped } } : {}) };
  const cleanRight = { ...right, ...(right.grouped ? { grouped: { ...right.grouped } } : {}) };
  const towers = {
    leftA: left.a,
    leftB: left.b,
    rightA: right.a,
    rightB: right.b,
  };
  const enc = {
    uid,
    nodeId,
    kind: meta.kind,
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
    isSimplified,
    left: cleanLeft,
    right: cleanRight,
    towers,
    blueprintLog: [displayEq],
    beamActions: initialBeamActions,
    stepsUsed: 0,
    usedShortcut: false,
    resetCount: 0,
    missesOnItem: 0,
    visualHint: `${varSymbol} = ${answer} balances both towers`,
    _initialSnapshot: {
      left: { ...cleanLeft, ...(cleanLeft.grouped ? { grouped: { ...cleanLeft.grouped } } : {}) },
      right: { ...cleanRight, ...(cleanRight.grouped ? { grouped: { ...cleanRight.grouped } } : {}) },
      towers: { ...towers },
      equationText: displayEq,
      blueprintLog: [displayEq],
      beamActions: initialBeamActions.map((a) => ({ ...a })),
    },
  };
  if (rampMeta) enc.rampMeta = rampMeta;
  return enc;
}

function captureSnapshotIfMissing(encounter) {
  if (encounter._initialSnapshot) return encounter._initialSnapshot;
  return {
    left: encounter.left
      ? { ...encounter.left, ...(encounter.left.grouped ? { grouped: { ...encounter.left.grouped } } : {}) }
      : undefined,
    right: encounter.right
      ? { ...encounter.right, ...(encounter.right.grouped ? { grouped: { ...encounter.right.grouped } } : {}) }
      : undefined,
    towers: encounter.towers ? { ...encounter.towers } : undefined,
    equationText: encounter.equationText,
    blueprintLog: encounter.blueprintLog ? [...encounter.blueprintLog] : [encounter.equationText],
    beamActions: (encounter.beamActions || [])
      .filter((a) => a.id !== "reset_steps")
      .map((a) => ({ ...a })),
  };
}

/**
 * Applies a voluntary Twin-Beam symmetric transformation (or `"reset_steps"`) to an active encounter.
 * Never penalizes; repel_trap teaches like-term physics with zero shame!
 */
export function applyBeamAction(encounter, actionId, progress, session = null) {
  if (!encounter || typeof encounter !== "object") return { kind: "noop", encounter };

  if (actionId === "reset_steps") {
    const snap = captureSnapshotIfMissing(encounter);
    const prevSteps = Math.max(0, Math.floor(Number(encounter.stepsUsed) || 0));
    const prevTotal = Math.max(prevSteps, Math.floor(Number(encounter.totalStepsUsed) || 0));
    const prevResets = Math.max(0, Math.floor(Number(encounter.resetCount) || 0));
    const nextResetCount = prevResets + 1;
    if (nextResetCount >= 2 && session && typeof session === "object") {
      const curFriction = Number.isFinite(session.friction) ? session.friction : 0;
      session.friction = curFriction + 0.6;
    }
    const restored = {
      ...encounter,
      equationText: snap.equationText,
      blueprintLog: [...snap.blueprintLog],
      beamActions: snap.beamActions.map((a) => ({ ...a })),
      stepsUsed: 0,
      totalStepsUsed: prevTotal,
      usedShortcut: false,
      resetCount: nextResetCount,
      _initialSnapshot: snap,
    };
    if (snap.left) {
      restored.left = { ...snap.left, ...(snap.left.grouped ? { grouped: { ...snap.left.grouped } } : {}) };
    }
    if (snap.right) {
      restored.right = { ...snap.right, ...(snap.right.grouped ? { grouped: { ...snap.right.grouped } } : {}) };
    }
    if (snap.towers) {
      restored.towers = { ...snap.towers };
    }
    return {
      kind: "transformed",
      wasReset: true,
      cue: "Steps reset to start!",
      encounter: restored,
    };
  }

  const act = (encounter.beamActions || []).find((a) => a.id === actionId);
  if (!act) return { kind: "noop", encounter };

  const baseSnap = captureSnapshotIfMissing(encounter);

  if (act.kind === "repel_trap") {
    if (progress && progress.misconceptionTags && act.tag) {
      progress.misconceptionTags[act.tag] = (progress.misconceptionTags[act.tag] || 0) + 1;
    }
    return {
      kind: "magnetic_repel",
      cue: act.cue || "Gold cubes & N-cores repel!",
      encounter: {
        ...encounter,
        _initialSnapshot: baseSnap,
        beamActions: encounter.beamActions.filter((a) => a.id !== actionId),
      },
    };
  }

  const prevSteps = Math.max(0, Math.floor(Number(encounter.stepsUsed) || 0));
  const prevTotal = Math.max(prevSteps, Math.floor(Number(encounter.totalStepsUsed) || 0));

  if (act.kind === "sym_step") {
    const forwardActions = buildBeamActionsForLinear(act.nextLeft, act.nextRight, encounter.varSymbol || "n");
    const nextBeamActions =
      forwardActions.length > 0
        ? [
            ...forwardActions,
            {
              id: "reset_steps",
              label: "Reset steps",
              kind: "reset_steps",
              cue: "Steps reset to start!",
            },
          ]
        : [];
    const updated = {
      ...encounter,
      _initialSnapshot: baseSnap,
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
      stepsUsed: prevSteps + 1,
      totalStepsUsed: prevTotal + 1,
      usedShortcut: Boolean(encounter.usedShortcut || act.isShortcut),
    };
    return { kind: "transformed", cue: act.cue, encounter: updated };
  }

  const remainingForward = encounter.beamActions.filter((a) => a.id !== actionId && a.id !== "reset_steps");
  const updated = {
    ...encounter,
    _initialSnapshot: baseSnap,
    equationText: act.nextEquationText || encounter.equationText,
    blueprintLog: [
      ...(encounter.blueprintLog || [encounter.equationText]),
      act.nextEquationText || encounter.equationText,
    ],
    beamActions:
      remainingForward.length > 0
        ? [
            ...remainingForward,
            {
              id: "reset_steps",
              label: "Reset steps",
              kind: "reset_steps",
              cue: "Steps reset to start!",
            },
          ]
        : [],
    stepsUsed: prevSteps + 1,
    totalStepsUsed: prevTotal + 1,
  };
  return { kind: "transformed", cue: act.cue, encounter: updated };
}

function getCanonicalSteps(encounter) {
  const rawKind = encounter?.kind || NODE_MAP[encounter?.nodeId]?.kind || "eq_add";
  return CANONICAL_STEPS[rawKind] || 1;
}

function computePathEfficiency(encounter) {
  const stepsUsed = Math.max(0, Math.floor(Number(encounter?.stepsUsed) || 0));
  const resetCount = Math.max(0, Math.floor(Number(encounter?.resetCount) || 0));
  const totalStepsUsed = Math.max(stepsUsed, Math.floor(Number(encounter?.totalStepsUsed) || 0));
  const sCanonical = getCanonicalSteps(encounter);

  if (resetCount >= 2 || totalStepsUsed > sCanonical + 1) {
    return 0.5;
  }

  if (stepsUsed === 0) {
    if (totalStepsUsed === 0 && resetCount === 0) {
      return 1.5;
    }
    return resetCount === 1 && totalStepsUsed <= sCanonical ? 0.8 : 0.5;
  }

  if (encounter?.usedShortcut && stepsUsed <= 2 && resetCount <= 1 && totalStepsUsed <= 3) {
    return stepsUsed === 1 ? 1.25 : 1.1;
  }

  const hasRemainingBeamSteps =
    !Array.isArray(encounter?.beamActions) ||
    encounter.beamActions.some((a) => a && a.id !== "reset_steps" && a.kind !== "repel_trap");

  if (stepsUsed < sCanonical && hasRemainingBeamSteps && resetCount === 0 && totalStepsUsed === stepsUsed) {
    return 1.1;
  }

  if (stepsUsed <= sCanonical && resetCount === 0 && totalStepsUsed === stepsUsed) {
    return 0.85;
  }

  if (resetCount <= 1 && totalStepsUsed <= sCanonical + 1) {
    return 0.75;
  }

  return 0.5;
}

function toFiniteCommitNumber(v) {
  if (
    v === null ||
    v === undefined ||
    typeof v === "boolean" ||
    typeof v === "object" ||
    typeof v === "symbol" ||
    typeof v === "function"
  ) {
    return NaN;
  }
  if (typeof v === "string" && v.trim() === "") return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function normalizeCommitSession(session) {
  const s = session && typeof session === "object" && !Array.isArray(session) ? session : createSessionState();
  if (!Number.isFinite(s.friction)) s.friction = 0;
  if (!Number.isFinite(s.consecutiveMisses)) s.consecutiveMisses = 0;
  if (!Number.isFinite(s.consecutiveWins)) s.consecutiveWins = 0;
  if (!Number.isFinite(s.overdriveStreak)) s.overdriveStreak = 0;
  if (!Number.isFinite(s.cooldownRemaining)) s.cooldownRemaining = 0;
  if (!Array.isArray(s.shelvedIds)) s.shelvedIds = [];
  if (!Array.isArray(s.shelvedLog)) s.shelvedLog = [];
  if (!Array.isArray(s.surgeQueue)) s.surgeQueue = [];
  if (!Array.isArray(s.recentNodeIds)) s.recentNodeIds = [];
  if (!Array.isArray(s.calibrationSpawnedIds)) s.calibrationSpawnedIds = [];
  return s;
}

function normalizeCommitProgress(progress) {
  const p = progress && typeof progress === "object" && !Array.isArray(progress) ? progress : createInitialProgress();
  if (!p.nodes || typeof p.nodes !== "object" || Array.isArray(p.nodes)) p.nodes = {};
  if (!p.records || typeof p.records !== "object" || Array.isArray(p.records)) p.records = {};
  if (!p.misconceptionTags || typeof p.misconceptionTags !== "object" || Array.isArray(p.misconceptionTags)) {
    p.misconceptionTags = {};
  }
  if (!Array.isArray(p.unlockedWorlds)) p.unlockedWorlds = ["W0", "W1"];
  if (!Array.isArray(p.discoveredMysteries)) p.discoveredMysteries = [];
  if (!Number.isFinite(p.fluxShards)) p.fluxShards = 0;
  if (!Number.isFinite(p.totalSolved)) p.totalSolved = 0;
  return p;
}

/**
 * Evaluates a physical commit (Ramming Cryo-Gate, Launching Holo-Ramp, Brewing Cauldron).
 * Enforces:
 * - Strict non-finite/blank/Symbol/function input rejection before mutating mastery or WebGL deltas
 * - planMs <= 12000ms cap on rolling avgPlanMs
 * - Unified 1.5x Pioneer/Overdrive shards (priorStage <= 1 || eta >= 1.0 || overdrive)
 * - 1.25x BKT+ pLearn boost when eta >= 1.0, full pLearn on clean Twin-Beam (eta = 0.85)
 * - 2-miss warm Fox reveal + full 14 base shard payout + session shelve
 * - Dynamic Friction Cushion (Soft-Swap 1.8..2.8, Surge >= 2.8, Cooldown >= 4.2)
 */
export function evaluateCommit(params = {}) {
  const {
    encounter,
    committedValue,
    planMs = 2200,
    execMs = 800,
    progress: rawProgress,
    session: rawSession,
    rng = Math.random,
  } = params && typeof params === "object" ? params : {};

  const numVal = toFiniteCommitNumber(committedValue);
  const target = encounter && typeof encounter === "object" ? toFiniteCommitNumber(encounter.answer) : NaN;

  if (!Number.isFinite(numVal) || !encounter || typeof encounter !== "object" || !Number.isFinite(target)) {
    const startDial = encounter && typeof encounter === "object" ? toFiniteCommitNumber(encounter.startDial) : NaN;
    const fallbackDial = Number.isFinite(startDial) ? startDial : 0;
    return {
      outcome: "nudge",
      invalidInput: true,
      overdrive: false,
      shardsEarned: 0,
      delta: 0,
      suggestedDial: fallbackDial,
      cue: "Dial a number first!",
    };
  }

  const progress = normalizeCommitProgress(rawProgress);
  const session = normalizeCommitSession(rawSession);
  const safeRng = typeof rng === "function" ? rng : Math.random;

  const parsedPlan = toFiniteCommitNumber(planMs);
  const rawPlanMs = Number.isFinite(parsedPlan) ? Math.max(0, parsedPlan) : 2200;
  const cappedPlanMs = Math.min(12000, rawPlanMs);
  const parsedExec = toFiniteCommitNumber(execMs);
  const safeExecMs = Number.isFinite(parsedExec) ? Math.min(30000, Math.max(0, parsedExec)) : 800;

  const delta = numVal - target;
  const hit = Math.abs(delta) < 1e-6;
  const node = progress.nodes[encounter.nodeId] || {
    pKnow: 0.25,
    stage: 0,
    attempts: 0,
    wins: 0,
    overdrives: 0,
    camouflageCleared: false,
    avgPlanMs: 0,
    avgExecMs: 0,
    lastSeenAt: 0,
  };
  progress.nodes[encounter.nodeId] = node;
  node.attempts += 1;
  node.lastSeenAt = Date.now();
  node.avgPlanMs = node.avgPlanMs
    ? Math.min(12000, Math.round(0.7 * node.avgPlanMs + 0.3 * cappedPlanMs))
    : Math.round(cappedPlanMs);
  node.avgExecMs = node.avgExecMs
    ? Math.round(0.7 * node.avgExecMs + 0.3 * safeExecMs)
    : Math.round(safeExecMs);

  const hesitated = rawPlanMs > 16000;

  if (hit) {
    const stepsUsed = Math.max(0, Math.floor(Number(encounter.stepsUsed) || 0));
    const resetCount = Math.max(0, Math.floor(Number(encounter.resetCount) || 0));
    const totalStepsUsed = Math.max(stepsUsed, Math.floor(Number(encounter.totalStepsUsed) || 0));
    const eta = computePathEfficiency(encounter);
    const priorStage = node.stage || 0;
    const pioneerBonus = priorStage <= 1;
    const efficientSolve = eta >= 1.0;
    const overdrive =
      resetCount < 2 &&
      ((stepsUsed === 0 && totalStepsUsed === 0 && resetCount === 0) ||
        Boolean(encounter.usedShortcut && stepsUsed === 1 && resetCount <= 1 && totalStepsUsed <= 3));
    const inSurgeNow = Boolean(session.inSurge || encounter.isSurgeItem);
    const baseShards = inSurgeNow ? 18 : 14;
    const coreShards = overdrive || efficientSolve || pioneerBonus ? Math.round(baseShards * 1.5) : baseShards;
    const sunshineBonus = getWeeklySunshineBonus(progress).bonusShards;
    const shardsEarned = coreShards + sunshineBonus;

    node.wins += 1;
    if (overdrive) node.overdrives += 1;
    if (encounter.isCamouflage) node.camouflageCleared = true;

    // BloomN_BKT+ with 1.25x Path Efficiency boost when eta >= 1.0
    const pSlip = 0.08;
    const pGuess = 0.06;
    const pLearnBase = 0.22;
    const pLearn = eta >= 1.0 ? pLearnBase * 1.25 : eta < 0.6 ? 0.1 : pLearnBase;
    const prior = node.pKnow;
    const post = (prior * (1 - pSlip)) / (prior * (1 - pSlip) + (1 - prior) * pGuess);
    node.pKnow = Math.min(0.99, post + (1 - post) * pLearn);
    updateNodeStage(node, eta);

    progress.fluxShards += shardsEarned;
    progress.unsyncedFlux = (progress.unsyncedFlux || 0) + shardsEarned;
    progress.totalSolved += 1;
    progress.records.foxesWoken = (progress.records.foxesWoken || 0) + 1;

    if (encounter.nodeId === "W6.3" && progress.games?.oddroot) {
      progress.games.oddroot.mosaicForged = true;
    }

    if (target < 0 && Math.abs(target) > (progress.records.deepestSubZero || 0)) {
      progress.records.deepestSubZero = Math.abs(target);
    }
    if (target <= -100) {
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

    if (session.surgeFinalPending && (!session.surgeQueue || session.surgeQueue.length === 0)) {
      session.inSurge = false;
      session.surgeFinalPending = false;
    }

    // Handle calibration progression if in W0
    let calibrationFinished = false;
    if (!progress.calibrated && encounter.worldId === "W0") {
      calibrationFinished = recordCalibrationStep(progress, encounter.nodeId, true);
    }

    // Unlock adjacent world when >=2 nodes reach stage >= 2
    unlockFrontierWorlds(progress);

    // Organic 15% Overdrive Surge on 5-win streaks (post-calibration non-W0 only!)
    let surgeTriggered = false;
    if (
      !session.inSurge &&
      progress.calibrated &&
      encounter.worldId !== "W0" &&
      session.consecutiveWins >= 5 &&
      safeRng() < 0.15
    ) {
      queueOverdriveSurge(progress, session, encounter.nodeId);
      surgeTriggered = true;
    }

    progress.rev = Date.now();
    return {
      outcome: "clear",
      overdrive,
      eta,
      pioneerBonus,
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

  if (encounter.worldId !== "W0" && session.friction >= 4.2) {
    session.cooldownRemaining = 4;
  }

  if (numVal === -target && target !== 0) {
    progress.misconceptionTags.sign_flip = (progress.misconceptionTags.sign_flip || 0) + 1;
  }

  // Gentle BKT update (bounded floor so confidence never craters)
  node.pKnow = Math.max(0.12, node.pKnow * 0.88);
  updateNodeStage(node, 1.0);

  // 2nd miss on same obstacle -> Warm Fox 3D Reveal + full 14 base shards + shelve!
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

    if (session.surgeFinalPending && (!session.surgeQueue || session.surgeQueue.length === 0)) {
      session.inSurge = false;
      session.surgeFinalPending = false;
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
  const cleanDelta = Number.isInteger(delta) ? Math.abs(delta) : Number(Math.abs(delta).toFixed(2));
  let deltaCue = delta > 0 ? `${cleanDelta} too high` : `${cleanDelta} too low`;
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

function updateNodeStage(node, eta = 1.0) {
  if (node.pKnow >= 0.9 && node.wins >= 2 && node.camouflageCleared && eta >= 0.6) {
    node.stage = Math.max(node.stage, 3);
  } else if (node.pKnow >= 0.72) {
    node.stage = Math.max(node.stage, 2);
  } else if (node.pKnow >= 0.45 || node.wins >= 1) {
    node.stage = Math.max(node.stage, 1);
  }
}

function recordCalibrationStep(progress, nodeId, cleanHit) {
  progress.calibrationHits = progress.calibrationHits || [];
  const existing = progress.calibrationHits.find((h) => h.nodeId === nodeId);
  if (existing) {
    existing.cleanHit = Boolean(existing.cleanHit || cleanHit);
  } else {
    progress.calibrationHits.push({ nodeId, cleanHit: Boolean(cleanHit) });
  }
  progress.calibrationStep = progress.calibrationHits.length;

  if (progress.calibrationStep < WORLDS[0].nodes.length) return false;

  progress.calibrated = true;
  const hitSet = new Set(progress.calibrationHits.filter((h) => h.cleanHit).map((h) => h.nodeId));

  if (hitSet.has("W0.5") && hitSet.has("W0.6")) {
    progress.activeWorld = "W2";
    ensureUnlocked(progress, ["W1", "W2", "W3", "W4"]);
  } else if (hitSet.has("W0.3") || hitSet.has("W0.4")) {
    progress.activeWorld = "W2";
    ensureUnlocked(progress, ["W1", "W2", "W3"]);
  } else {
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
 * 2 effortless mastered favorites + 1 targeted atomic repair bridge + 1 triumphant closer!
 */
export function queueOverdriveSurge(progress, session, struggledNodeId) {
  const shelved = new Set(session.shelvedIds || []);
  const masteredPool = Object.entries(progress.nodes || {})
    .filter(([id, st]) => !id.startsWith("W0") && st.stage >= 2 && id !== struggledNodeId && !shelved.has(id))
    .map(([id]) => id);

  const fallbackPool = ["W1.1", "W2.1", "W1.3", "W1.2"].filter(
    (id) => id !== struggledNodeId && !shelved.has(id)
  );
  const easyPool = masteredPool.length >= 2 ? masteredPool : [...masteredPool, ...fallbackPool, "W1.1", "W2.1"];

  const fav1 = easyPool[0] || "W1.1";
  const fav2 = easyPool.find((id) => id !== fav1) || "W2.1";

  let bridge = !progress.calibrated ? "W1.1" : ATOMIC_REPAIR_MAP[struggledNodeId] || "W1.1";
  if (shelved.has(bridge) && bridge !== "W1.1") {
    bridge = !shelved.has("W1.1") ? "W1.1" : "W2.1";
  }

  const closer = masteredPool.find((id) => id !== fav1 && id !== fav2) || (fav2 !== "W2.1" ? "W2.1" : "W1.1");

  session.surgeQueue = [fav1, fav2, bridge, closer];
  session.surgeRepairNodeId = bridge;
  session.inSurge = true;
  session.surgeFinalPending = false;
  session.friction = 1.0;
}

/**
 * Selects the next adaptive encounter for the active world (or Calibration / Surge / Cooldown / Soft-Swap).
 */
export function pickNextEncounter(progress, session, preferredWorldId = null, rng = Math.random) {
  // 1. Deterministic W0 Calibration (works for both 1-by-1 and synchronous 3-gate waves!)
  if (!progress.calibrated && (!preferredWorldId || preferredWorldId === "W0")) {
    const w0Ids = WORLDS[0].nodes.map((n) => n.id);
    const completedSet = new Set((progress.calibrationHits || []).map((h) => h.nodeId));
    const remaining = w0Ids.filter((id) => !completedSet.has(id));
    session.calibrationSpawnedIds = (session.calibrationSpawnedIds || []).filter((id) => !completedSet.has(id));
    let nextCalId = remaining.find((id) => !session.calibrationSpawnedIds.includes(id));
    if (!nextCalId) {
      session.calibrationSpawnedIds = [];
      nextCalId = remaining[0] || w0Ids[0];
    }
    session.calibrationSpawnedIds.push(nextCalId);
    session.calibrationCursor = Math.min(w0Ids.length, completedSet.size + session.calibrationSpawnedIds.length);
    return generateEncounter(nextCalId, { rng, camouflage: false });
  }

  // 2. 4-Item Overdrive Surge Wave
  if (session.surgeQueue && session.surgeQueue.length > 0) {
    const nextId = session.surgeQueue.shift();
    session.inSurge = true;
    session.surgeFinalPending = session.surgeQueue.length === 0;
    const isRepair = nextId === session.surgeRepairNodeId;
    const enc = generateEncounter(nextId, { rng, camouflage: false, simplified: isRepair });
    enc.isSurgeItem = true;
    if (isRepair) enc.isAtomicRepair = true;
    return enc;
  }
  session.inSurge = false;
  session.surgeFinalPending = false;

  const worldId =
    preferredWorldId && preferredWorldId !== "W0"
      ? preferredWorldId
      : progress.activeWorld === "W0"
      ? "W1"
      : progress.activeWorld;
  const world = WORLDS.find((w) => w.id === worldId) || WORLDS[1];
  const shelved = new Set(session.shelvedIds || []);

  // 3. Victory Cooldown (F_t >= 4.2 or active cooldownRemaining > 0)
  if ((session.friction || 0) >= 4.2 || (session.cooldownRemaining || 0) > 0) {
    if ((session.cooldownRemaining || 0) <= 0) {
      session.cooldownRemaining = 4;
    }
    session.cooldownRemaining -= 1;
    if (session.cooldownRemaining === 0 && (session.friction || 0) >= 4.2) {
      session.friction = 1.6;
    }
    const masteredFavs = Object.entries(progress.nodes || {})
      .filter(([id, st]) => !id.startsWith("W0") && st.stage >= 2 && !shelved.has(id))
      .map(([id]) => id);
    const familiarFavs = Object.entries(progress.nodes || {})
      .filter(([id, st]) => !id.startsWith("W0") && st.stage >= 1 && !shelved.has(id))
      .map(([id]) => id);
    const cdPool =
      masteredFavs.length > 0
        ? masteredFavs
        : familiarFavs.length > 0
        ? familiarFavs
        : ["W1.1", "W1.2", "W2.1"];
    const nonRecent = cdPool.filter((id) => !session.recentNodeIds.slice(-2).includes(id));
    const chosenId = pick(nonRecent.length > 0 ? nonRecent : cdPool, rng);
    session.recentNodeIds.push(chosenId);
    if (session.recentNodeIds.length > 8) session.recentNodeIds.shift();
    const enc = generateEncounter(chosenId, { rng, camouflage: false, simplified: true });
    enc.cooldownItem = true;
    return enc;
  }

  // 4. Silent Queue Soft-Swap (1.8 <= F_t < 2.8) — defer brand-new stage 0 frontier nodes
  if ((session.friction || 0) >= 1.8 && (session.friction || 0) < 2.8) {
    const prevWorld = WORLDS[Math.max(1, world.index - 1)] || WORLDS[1];
    const combinedNodes = [
      ...prevWorld.nodes,
      ...world.nodes.filter((n) => !prevWorld.nodes.some((p) => p.id === n.id)),
    ].filter((n) => !shelved.has(n.id));
    const stage2Pool = combinedNodes.filter((n) => (progress.nodes[n.id]?.stage || 0) >= 2);
    const stage1Pool = combinedNodes.filter((n) => (progress.nodes[n.id]?.stage || 0) >= 1);
    const softPool =
      stage2Pool.length > 0
        ? stage2Pool
        : stage1Pool.length > 0
        ? stage1Pool
        : combinedNodes.length > 0
        ? combinedNodes
        : world.nodes;
    const nonRecent = softPool.filter((n) => !session.recentNodeIds.slice(-2).includes(n.id));
    const chosen = pick(nonRecent.length > 0 ? nonRecent : softPool, rng);
    session.recentNodeIds.push(chosen.id);
    if (session.recentNodeIds.length > 8) session.recentNodeIds.shift();
    const enc = generateEncounter(chosen.id, { rng, camouflage: false, simplified: true });
    enc.softSwapped = true;
    return enc;
  }

  // 5. Standard Frontier Selection
  const candidates = world.nodes.filter((n) => !shelved.has(n.id));
  const pool = candidates.length > 0 ? candidates : world.nodes;

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
 * Pure deterministic Cross-Realm Unlocks selector shared by Frostwake (#1) and Oddroot (#2).
 */
export function getCrossRealmUnlocks(progress) {
  const p = progress || {};
  const rec = p.records || {};
  const nodes = p.nodes || {};
  const myst = new Set(p.discoveredMysteries || []);
  const upg = new Set([
    ...(p.ownedUpgrades || []),
    ...(p.games?.oddroot?.sanctuaryUpgrades || []),
  ]);
  const hatched = new Set([
    ...(p.games?.oddroot?.hatchedCreatures || []),
    ...(p.oddrootCreatures || []),
  ]);

  const subZeroHit = Boolean(
    (rec.deepestSubZero || 0) >= 100 ||
      myst.has("subzero_abyss") ||
      (nodes["W1.2"]?.stage || 0) >= 2 ||
      (nodes["W1.3"]?.stage || 0) >= 2 ||
      hatched.has("zero_g_toad") ||
      hatched.has("astro_toad")
  );

  const snowLiliesHit = Boolean(
    upg.has("prismatic_trail") ||
      upg.has("or_spore_wake") ||
      upg.has("or_prism_wake") ||
      (nodes["W2.1"]?.stage || 0) >= 2 ||
      hatched.size >= 3
  );

  const mosaicHit = Boolean(
    p.games?.oddroot?.mosaicForged ||
      (nodes["W6.3"]?.stage || 0) >= 2 ||
      upg.has("celestial_crown") ||
      upg.has("or_antler_crown")
  );

  const auroraTrimHit = Boolean(
    mosaicHit ||
      upg.has("wide_blade") ||
      upg.has("or_tusk_plow") ||
      (rec.bestOverdriveStreak || 0) >= 3
  );

  const frostwakePlowTrim = mosaicHit ? "golden_mosaic" : subZeroHit ? "cryo_buoyancy" : "standard";
  const moonHit = myst.has("moon_center");
  const astrolabeHit = Boolean(myst.has("astrolabe_lock") || (nodes["W5.2"]?.stage || 0) >= 2);
  const whaleHit = Boolean(
    myst.has("aurora_whale") ||
      (rec.bestOverdriveStreak || 0) >= 3 ||
      hatched.has("starlight_whale") ||
      hatched.has("starlight_sky_whale") ||
      hatched.has("aurora_whale")
  );

  return {
    astroToadUnlocked: subZeroHit,
    astroToadCabMascot: subZeroHit,
    cryoToadMascot: subZeroHit,
    cryoBuoyancyTrim: subZeroHit,
    subZeroAbyssUnlocked: subZeroHit,
    subZeroUnlocked: subZeroHit,
    snowLiliesUnlocked: snowLiliesHit,
    bioluminescentSnowLilies: snowLiliesHit,
    goldenMosaicTrimUnlocked: mosaicHit,
    goldenMosaicPlowTrim: mosaicHit,
    goldenMosaicTrim: mosaicHit,
    mosaicUnlocked: mosaicHit,
    auroraBladeTrimUnlocked: auroraTrimHit,
    frostwakePlowTrim,
    silverMoonLantern: moonHit,
    moonLanternUnlocked: moonHit,
    titanAstrolabeSynced: astrolabeHit,
    astrolabeUnlocked: astrolabeHit,
    starlightWhaleSynced: whaleHit,
    skyWhaleUnlocked: whaleHit,
  };
}

function architectThreshold(level) {
  const n = Math.max(1, level) - 1;
  return 100 * n + 10 * n * Math.max(0, n - 1);
}

/**
 * Computes monotonic cross-realm Architect Level (Lv. 1..99).
 * Never depends on spendable `fluxShards`, so buying upgrades never drops level!
 */
export function computeArchitectLevel(progress) {
  const p = progress || {};
  const nodes = p.nodes || {};
  let nodeXp = 0;
  for (const st of Object.values(nodes)) {
    if (!st) continue;
    nodeXp += (st.stage || 0) * 45 + (st.wins || 0) * 12 + (st.overdrives || 0) * 10;
  }

  const uniqueUpgrades = new Set([
    ...(p.ownedUpgrades || []),
    ...(p.games?.oddroot?.sanctuaryUpgrades || []),
  ]).size;
  const hatchedCount = new Set([
    ...(p.games?.oddroot?.hatchedCreatures || []),
    ...(p.oddrootCreatures || []),
  ]).size;
  const mystCount = (p.discoveredMysteries || []).length;
  const snowM2 = Math.max(p.snowClearedM2 || 0, p.games?.frostwake?.snowClearedM2 || 0);
  const blightM2 = p.games?.oddroot?.blightClearedM2 || 0;
  const realmActions =
    (p.games?.oddroot?.cauldronsBrewed || 0) +
    (p.games?.frostwake?.rimeCreepsCleared || 0) +
    (p.games?.oddroot?.blightClearedCount || 0);

  const xp = Math.max(
    0,
    Math.floor(
      (p.totalSolved || 0) * 30 +
        nodeXp +
        mystCount * 75 +
        uniqueUpgrades * 50 +
        hatchedCount * 55 +
        Math.floor((snowM2 + blightM2) / 25) * 5 +
        realmActions * 8
    )
  );

  let level = 1;
  while (level < 99 && xp >= architectThreshold(level + 1)) {
    level += 1;
  }

  const curFloor = architectThreshold(level);
  const nextLevelXp = level < 99 ? architectThreshold(level + 1) : curFloor;
  const xpIntoLevel = xp - curFloor;
  const xpForNextLevel = level < 99 ? nextLevelXp - curFloor : 0;
  const progressPct =
    level >= 99 || xpForNextLevel <= 0
      ? 100
      : Math.max(0, Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100)));

  const res = {
    level,
    maxLevel: 99,
    xp,
    nextLevelXp,
    xpIntoLevel,
    xpForNextLevel,
    progressPct,
    title: computeHeroTitle(p),
    label: `Lv. ${level}`,
  };
  Object.defineProperty(res, "valueOf", {
    value: () => level,
    enumerable: false,
  });
  return res;
}

function computeIsoWeekAndDay(dateInput = new Date()) {
  const raw = dateInput instanceof Date ? new Date(dateInput.getTime()) : new Date(dateInput);
  const d = Number.isNaN(raw.getTime()) ? new Date() : raw;
  const dayKey = d.toISOString().slice(0, 10);
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((utc - yearStart) / 86400000 + 1) / 7);
  const weekKey = `${utc.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
  return { weekKey, dayKey };
}

function formatSunshineSummary(weekKey, days, addedToday) {
  const suns = Math.min(4, days.length);
  const bonusShards = suns >= 4 ? 2 : suns >= 2 ? 1 : 0;
  const richThicket = suns >= 3;
  return {
    weekKey,
    days: [...days],
    suns,
    maxSuns: 4,
    addedToday: Boolean(addedToday),
    bonusShards,
    shardBonus: bonusShards,
    richThicket,
    richMossActive: richThicket,
  };
}

/**
 * Pure read-only helper inspecting current 4-Sun Weekly Sunshine bonus without mutating progress.
 */
export function getWeeklySunshineBonus(progress) {
  const ws = progress?.weeklySunshine || { weekKey: "", days: [] };
  const days = Array.isArray(ws.days) ? Array.from(new Set(ws.days)).sort() : [];
  return formatSunshineSummary(ws.weekKey || "", days, false);
}

/**
 * Records a gentle 4-Sun Weekly Sunshine check-in (zero streak-loss penalty across weeks).
 */
export function recordWeeklySunshine(progress, dateInput = new Date()) {
  const { weekKey, dayKey } = computeIsoWeekAndDay(dateInput);
  if (!progress) {
    return formatSunshineSummary(weekKey, [dayKey], true);
  }
  const prev = progress.weeklySunshine || { weekKey: "", days: [] };
  let days = Array.isArray(prev.days) ? Array.from(new Set(prev.days)) : [];
  let addedToday = false;

  if (prev.weekKey !== weekKey) {
    days = [dayKey];
    addedToday = true;
  } else if (!days.includes(dayKey)) {
    days.push(dayKey);
    addedToday = true;
  }
  days.sort();
  progress.weeklySunshine = { weekKey, days };
  return formatSunshineSummary(weekKey, days, addedToday);
}

/**
 * Computes an orthogonal, non-ranked Hero Title celebrating each sibling's unique style!
 */
export function computeHeroTitle(progress) {
  const p = progress || {};
  const r = p.records || {};
  const myst = p.discoveredMysteries || [];
  const orGame = p.games?.oddroot || {};
  const fwGame = p.games?.frostwake || {};

  if (orGame.mosaicForged || (p.nodes?.["W6.3"]?.stage || 0) >= 2) return "Mosaic Slab Master";
  if ((p.nodes?.["W2.1"]?.stage || 0) >= 3 && (p.nodes?.["W2.2"]?.stage || 0) >= 2) return "Grand Pattern Architect";
  if (myst.includes("moon_center") && myst.includes("astrolabe_lock")) return "Moonwell Astrolabe Keeper";
  if ((r.bestOverdriveStreak || 0) >= 4) return "Mental Overdrive Ace";
  if ((r.deepestSubZero || 0) >= 100) return "Sub-Zero Architect";
  if ((orGame.cauldronsBrewed || 0) >= 6 || (orGame.hatchedCreatures || []).length >= 3) return "Sanctuary Alchemist";
  if (myst.includes("astrolabe_lock")) return "Astrolabe Navigator";
  if ((orGame.longestVineGrindM || 0) >= 40 || (r.highestVineM || 0) >= 40) return "Starlight Vine-Rider";
  if ((r.longestRampM || 0) >= 40) return "Holo-Ramp Trailblazer";
  if (Math.max(p.snowClearedM2 || 0, fwGame.snowClearedM2 || 0) >= 250) return "Glacier Terra-Captain";
  if ((orGame.hatchedCreatures || []).length >= 1 || (orGame.blightClearedCount || 0) >= 3) return "Oddroot Pathfinder";
  return "Frostwake Pioneer";
}

function mergeBestTimedRun(aObj, bObj, secKey) {
  const aSecRaw = Number(aObj?.[secKey]);
  const bSecRaw = Number(bObj?.[secKey]);
  const aValid = Number.isFinite(aSecRaw) && aSecRaw > 0;
  const bValid = Number.isFinite(bSecRaw) && bSecRaw > 0;

  let bestSec = null;
  let winner = bObj || aObj || {};
  const fallback = winner === bObj ? aObj || {} : bObj || {};

  if (aValid && bValid) {
    if (aSecRaw <= bSecRaw) {
      bestSec = aSecRaw;
      winner = aObj;
    } else {
      bestSec = bSecRaw;
      winner = bObj;
    }
  } else if (aValid) {
    bestSec = aSecRaw;
    winner = aObj;
  } else if (bValid) {
    bestSec = bSecRaw;
    winner = bObj;
  }

  const winFrames = Array.isArray(winner?.ghostFrames) && winner.ghostFrames.length > 0
    ? winner.ghostFrames.slice(0, 240)
    : Array.isArray(fallback?.ghostFrames)
    ? fallback.ghostFrames.slice(0, 240)
    : [];

  const ghostBest = winner?.ghostBest ?? fallback?.ghostBest ?? null;
  return { bestSec, ghostFrames: winFrames, ghostBest };
}

/**
 * Monotonically merges two progress blobs across devices so offline play never loses shards, creatures, or mastery.
 */
export function mergeProgress(a, b) {
  if (!a) return b;
  if (!b) return a;
  const newer = (b.rev || 0) >= (a.rev || 0) ? b : a;
  const older = newer === b ? a : b;

  const mergedNodes = {};
  const allNodeIds = new Set([
    ...Object.keys(NODE_MAP),
    ...Object.keys(a.nodes || {}),
    ...Object.keys(b.nodes || {}),
  ]);
  for (const id of allNodeIds) {
    const na = a.nodes?.[id] || {};
    const nb = b.nodes?.[id] || {};
    const rawPlan = nb.avgPlanMs || na.avgPlanMs || 0;
    mergedNodes[id] = {
      pKnow: Math.max(na.pKnow || 0.15, nb.pKnow || 0.15),
      stage: Math.max(na.stage || 0, nb.stage || 0),
      attempts: Math.max(na.attempts || 0, nb.attempts || 0),
      wins: Math.max(na.wins || 0, nb.wins || 0),
      overdrives: Math.max(na.overdrives || 0, nb.overdrives || 0),
      camouflageCleared: Boolean(na.camouflageCleared || nb.camouflageCleared),
      avgPlanMs: rawPlan > 0 ? Math.min(12000, rawPlan) : 0,
      avgExecMs: nb.avgExecMs || na.avgExecMs || 0,
      lastSeenAt: Math.max(na.lastSeenAt || 0, nb.lastSeenAt || 0),
    };
  }

  // Calibration hits union by nodeId
  const calMap = new Map();
  for (const item of [...(a.calibrationHits || []), ...(b.calibrationHits || [])]) {
    if (!item || !item.nodeId) continue;
    const prev = calMap.get(item.nodeId);
    calMap.set(item.nodeId, {
      nodeId: item.nodeId,
      cleanHit: Boolean(prev?.cleanHit || item.cleanHit),
    });
  }
  const calibrationHits = Array.from(calMap.values());

  // Misconception tags per-key max
  const misconceptionTags = {};
  for (const k of new Set([...Object.keys(a.misconceptionTags || {}), ...Object.keys(b.misconceptionTags || {})])) {
    misconceptionTags[k] = Math.max(a.misconceptionTags?.[k] || 0, b.misconceptionTags?.[k] || 0);
  }

  // Weekly sunshine merge
  const wsA = a.weeklySunshine || { weekKey: "", days: [] };
  const wsB = b.weeklySunshine || { weekKey: "", days: [] };
  let weeklySunshine = { weekKey: "", days: [] };
  if (wsA.weekKey && wsA.weekKey === wsB.weekKey) {
    weeklySunshine = {
      weekKey: wsA.weekKey,
      days: Array.from(new Set([...(wsA.days || []), ...(wsB.days || [])])).sort(),
    };
  } else if ((wsB.weekKey || "") >= (wsA.weekKey || "")) {
    weeklySunshine = { weekKey: wsB.weekKey || "", days: Array.from(new Set(wsB.days || [])).sort() };
  } else {
    weeklySunshine = { weekKey: wsA.weekKey || "", days: Array.from(new Set(wsA.days || [])).sort() };
  }

  // Deep games.frostwake & games.oddroot merge
  const fwA = a.games?.frostwake || {};
  const fwB = b.games?.frostwake || {};
  const fwOlder = older.games?.frostwake || {};
  const fwNewer = newer.games?.frostwake || {};
  const fwRun = mergeBestTimedRun(fwOlder, fwNewer, "bestWaveSec");
  const mergedSnowM2 = Math.max(
    a.snowClearedM2 || 0,
    b.snowClearedM2 || 0,
    fwA.snowClearedM2 || 0,
    fwB.snowClearedM2 || 0
  );

  const orA = a.games?.oddroot || {};
  const orB = b.games?.oddroot || {};
  const orOlder = older.games?.oddroot || {};
  const orNewer = newer.games?.oddroot || {};
  const orRun = mergeBestTimedRun(orOlder, orNewer, "bestCircuitSec");

  const hatchedCreatures = Array.from(
    new Set([
      ...(orA.hatchedCreatures || []),
      ...(orB.hatchedCreatures || []),
      ...(a.oddrootCreatures || []),
      ...(b.oddrootCreatures || []),
    ])
  );
  const creatureStages = {};
  const stageKeys = new Set([
    ...Object.keys(orA.creatureStages || {}),
    ...Object.keys(orB.creatureStages || {}),
    ...hatchedCreatures,
  ]);
  for (const cid of stageKeys) {
    const sMax = Math.max(Number(orA.creatureStages?.[cid]) || 0, Number(orB.creatureStages?.[cid]) || 0);
    creatureStages[cid] = hatchedCreatures.includes(cid) ? Math.max(1, sMax) : sMax;
  }

  const longestVineGrindM = Math.max(orA.longestVineGrindM || 0, orB.longestVineGrindM || 0);

  return {
    ...older,
    ...newer,
    rev: Math.max(a.rev || 0, b.rev || 0),
    calibrated: Boolean(a.calibrated || b.calibrated),
    calibrationStep: Math.max(a.calibrationStep || 0, b.calibrationStep || 0, calibrationHits.length),
    calibrationHits,
    unlockedWorlds: Array.from(new Set([...(a.unlockedWorlds || []), ...(b.unlockedWorlds || [])])),
    fluxShards: Math.max(a.fluxShards || 0, b.fluxShards || 0),
    totalSolved: Math.max(a.totalSolved || 0, b.totalSolved || 0),
    snowClearedM2: mergedSnowM2,
    ownedUpgrades: Array.from(new Set([...(a.ownedUpgrades || []), ...(b.ownedUpgrades || [])])),
    discoveredMysteries: Array.from(new Set([...(a.discoveredMysteries || []), ...(b.discoveredMysteries || [])])),
    seenTrickFamilies: Array.from(new Set([...(a.seenTrickFamilies || []), ...(b.seenTrickFamilies || [])])),
    weeklySunshine,
    misconceptionTags,
    records: {
      bestOverdriveStreak: Math.max(a.records?.bestOverdriveStreak || 0, b.records?.bestOverdriveStreak || 0),
      longestRampM: Math.max(a.records?.longestRampM || 0, b.records?.longestRampM || 0),
      deepestSubZero: Math.max(a.records?.deepestSubZero || 0, b.records?.deepestSubZero || 0),
      foxesWoken: Math.max(a.records?.foxesWoken || 0, b.records?.foxesWoken || 0),
      creaturesHatched: Math.max(
        a.records?.creaturesHatched || 0,
        b.records?.creaturesHatched || 0,
        hatchedCreatures.length
      ),
      highestVineM: Math.max(a.records?.highestVineM || 0, b.records?.highestVineM || 0, longestVineGrindM),
    },
    games: {
      ...(older.games || {}),
      ...(newer.games || {}),
      frostwake: {
        ...fwOlder,
        ...fwNewer,
        equippedChassis:
          fwNewer.equippedChassis || fwOlder.equippedChassis || newer.equippedChassis || older.equippedChassis || "terra_dozer",
        snowClearedM2: mergedSnowM2,
        rimeCreepsCleared: Math.max(fwA.rimeCreepsCleared || 0, fwB.rimeCreepsCleared || 0),
        foxDensThawed: Math.max(fwA.foxDensThawed || 0, fwB.foxDensThawed || 0),
        bestWaveSec: fwRun.bestSec,
        ghostFrames: fwRun.ghostFrames,
        ghostBest: fwRun.ghostBest,
      },
      oddroot: {
        ...orOlder,
        ...orNewer,
        equippedMount: orNewer.equippedMount || orOlder.equippedMount || "bramble_boar",
        equippedStaff: orNewer.equippedStaff || orOlder.equippedStaff || "sun_siphon",
        cauldronsBrewed: Math.max(orA.cauldronsBrewed || 0, orB.cauldronsBrewed || 0),
        hatchedCreatures,
        creatureStages,
        sanctuaryUpgrades: Array.from(new Set([...(orA.sanctuaryUpgrades || []), ...(orB.sanctuaryUpgrades || [])])),
        blightClearedM2: Math.max(orA.blightClearedM2 || 0, orB.blightClearedM2 || 0),
        blightClearedCount: Math.max(orA.blightClearedCount || 0, orB.blightClearedCount || 0),
        longestVineGrindM,
        bestCircuitSec: orRun.bestSec,
        ghostFrames: orRun.ghostFrames,
        ghostBest: orRun.ghostBest,
        mosaicForged:
          typeof orA.mosaicForged === "number" || typeof orB.mosaicForged === "number"
            ? Math.max(Number(orA.mosaicForged) || 0, Number(orB.mosaicForged) || 0)
            : Boolean(orA.mosaicForged || orB.mosaicForged),
      },
    },
    nodes: mergedNodes,
  };
}
