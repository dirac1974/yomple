/**
 * Oddroot Wilds — Braided W0-W7 3D Sanctuary Shrines & Defensive Payload Normalizers
 * Builds 7 bespoke 3D sanctuary shrine archetypes across all 33 W0-W7 nodes:
 *  1. Unclamped Zero-Pair Thermal Cauldrons (-500..+500, steam-poofs, vacuum lift, 180° polarity)
 *  2. Swaying Rune-Pod Balance Bridges (torque lock, +Sun/-Frost/+x Pod/-x Buoyant Puff, magnetic repel)
 *  3. 3D Pattern Conservatory & Crystal Looms (Base + Frame*Group pedestals, distributive loom, k^2 canopy)
 *  4. Living Grind-Vine Cliff Rails & W4.4 Crossed Spore-Streams (<=15% stub, Δy caliper, Mega-Seed Pod)
 *  5. Moonwell Starlight Rings & Sky-Astrolabes (central Moon-Lantern, 90° diameter chord, trusses, squares)
 *  6. 3D Mosaic Slab Forges (x^2 slab + hinged (b/2)x wings + (b/2)^2 corner socket) & Parabolic Spore-Arches
 *  7. Mitosis Puffballs, Log Stage-Spires, Harmonic Bio-Waves & W7.4 90° Quarter-Turn Emerald i-Portals
 */

import * as THREE from "../vendor/three.module.min.js";
import * as CoreEngine from "../core/engine.js";

export const SHRINE_CHASM_SPAN_Z = 16.0;
export const SHRINE_STUB_SPAN_Z = 2.0; // 2.0 / 16.0 = 0.125 <= 0.15 Anti-Scrub Law
export const SHRINE_TARGET_Z = 12.8;

const BASE_PAD_Y = 1.2;
const VINE_Y_SCALE = 0.38;

const KIND_W5_4 = CoreEngine.NODE_MAP?.["W5.4"]?.kind || "sunbeam_elevation_ratio";
const KIND_W7_3 = CoreEngine.NODE_MAP?.["W7.3"]?.kind || "harmonic_wave_crest";

function isSunbeamRatioKind(kind, enc) {
  return (
    kind === KIND_W5_4 ||
    kind === "sunbeam_elevation_ratio" ||
    enc?.nodeId === "W5.4" ||
    (typeof kind === "string" && kind.startsWith("geo_") && kind.endsWith("_ratio"))
  );
}

function isHarmonicWaveKind(kind, enc) {
  return (
    kind === KIND_W7_3 ||
    kind === "harmonic_wave_crest" ||
    enc?.nodeId === "W7.3" ||
    Boolean(enc?.archMeta?.isWave) ||
    (typeof kind === "string" && kind.endsWith("_wave_crest"))
  );
}

function safeNum(val, fallback = 0) {
  if (
    val === null ||
    val === undefined ||
    typeof val === "boolean" ||
    typeof val === "symbol" ||
    typeof val === "object" ||
    (typeof val === "string" && val.trim() === "")
  ) {
    return fallback;
  }
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function safeEqText(enc) {
  const raw =
    Array.isArray(enc?.blueprintLog) && enc.blueprintLog[0] != null
      ? enc.blueprintLog[0]
      : enc?.equationText ?? "";
  if (typeof raw === "string") return raw.trim();
  if (typeof raw === "number") return Number.isFinite(raw) ? String(raw) : "";
  if (typeof raw === "boolean" || typeof raw === "bigint") return String(raw);
  return "";
}

export function elixirLevelToY(temp) {
  const t = safeNum(temp, 0);
  const sign = t === 0 ? 0 : t > 0 ? 1 : -1;
  const mag = Math.min(1.25, Math.log(1 + Math.abs(t) / 10) / Math.log(51));
  return 2.5 + 2.1 * sign * mag;
}

function yWorldFromMath(yMath) {
  return Math.max(0.35, Math.min(13.5, BASE_PAD_Y + safeNum(yMath, 0) * VINE_Y_SCALE));
}

export function createOddrootToonGradient() {
  const stops = [62, 124, 194, 255];
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 4; i++) {
    bytes[i * 4] = stops[i];
    bytes[i * 4 + 1] = stops[i];
    bytes[i * 4 + 2] = stops[i];
    bytes[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(bytes, 4, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

export function createOddrootToonRimMaterial(
  gradientMap,
  {
    color = 0x2ec4b6,
    emissive = 0x000000,
    emissiveIntensity = 0.0,
    rimColor = 0x62f5e4,
    rimPower = 2.6,
    rimIntensity = 0.45,
    transparent = false,
    opacity = 1.0,
    vertexColors = false,
    side = THREE.FrontSide,
  } = {}
) {
  const mat = new THREE.MeshToonMaterial({
    color,
    emissive,
    emissiveIntensity,
    gradientMap,
    transparent,
    opacity,
    vertexColors,
    side,
  });
  mat.userData.rimUniforms = {
    uRimColor: { value: new THREE.Color(rimColor) },
    uRimPower: { value: rimPower },
    uRimIntensity: { value: rimIntensity },
  };
  mat.customProgramCacheKey = () => "oddroot_toon_fresnel_v1";
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColor = mat.userData.rimUniforms.uRimColor;
    shader.uniforms.uRimPower = mat.userData.rimUniforms.uRimPower;
    shader.uniforms.uRimIntensity = mat.userData.rimUniforms.uRimIntensity;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform vec3 uRimColor;\nuniform float uRimPower;\nuniform float uRimIntensity;"
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        vec3 oddViewDir = normalize( vViewPosition );
        float oddRim = pow( 1.0 - clamp( abs( dot( normal, oddViewDir ) ), 0.0, 1.0 ), uRimPower );
        totalEmissiveRadiance += uRimColor * ( oddRim * uRimIntensity );`
      );
  };
  return mat;
}

export function resolveEncounterKind(enc) {
  if (!enc || typeof enc !== "object") return "eq_add";
  if (typeof enc.kind === "string" && enc.kind) return enc.kind;
  const fromMap = CoreEngine.NODE_MAP?.[enc.nodeId]?.kind;
  if (fromMap) return fromMap;
  const eqText = safeEqText(enc);
  if (
    enc.portalMeta ||
    enc.iPortalMeta ||
    enc.nodeId === "W7.4" ||
    /\bi\^|\bquarter[- ]?turn|i²/i.test(eqText)
  ) {
    return "complex_i_rotation";
  }
  if (enc.patternMeta) return "seq_linear";
  if (enc.rampMeta?.isSystem || (enc.encounterType === "holo_ramp" && enc.left && enc.right)) {
    return "sys_intersection";
  }
  if (enc.rampMeta?.solveForB) return "ramp_point_target";
  if (enc.rampMeta?.mode === "slope") return "ramp_slope_only";
  if (enc.rampMeta) return "ramp_linear";
  if (enc.archMeta?.isWave || enc.nodeId === "W7.3") return KIND_W7_3;
  if (enc.archMeta && /vertex|peak|\)\²|\)\^2/i.test(eqText)) {
    return "arch_vertex_eval";
  }
  if (enc.archMeta) return "arch_roots";
  if (enc.astrolabeMeta?.mode === "thales") return "geo_astrolabe_thales";
  if (enc.astrolabeMeta?.mode === "truss") return "geo_triangle_truss";
  if (enc.astrolabeMeta) return "geo_parallel_angles";
  if ((enc.harpoonMeta && /\b(?:sin|cos|tan)\b/i.test(eqText)) || enc.nodeId === "W5.4") {
    return KIND_W5_4;
  }
  if (enc.harpoonMeta) return "geo_pythagoras";
  if (/x\²|x\^2/i.test(eqText) || enc.nodeId === "W6.3") return "quad_complete_sq";
  if (/log_/i.test(eqText)) return "log_stage";
  if (/\^\d+\)/.test(eqText)) return "exp_growth";
  if (/\^\d+/.test(eqText)) return "exp_power";
  if (/m\²|scale\s+k/i.test(eqText)) return "geo_scale_area";
  if (/\[n\s*=/.test(eqText)) return "expr_distribute";
  if (/-\s*\(-/.test(eqText)) return "int_double_neg";
  if (/\(-?\d+\)\s*[×x*]\s*\(-?\d+\)/.test(eqText)) return "int_polarity";
  if (enc.left?.grouped) return "eq_parens";
  if (enc.isCamouflage) return "eq_twostep_camo";
  if (enc.left?.a && enc.right?.a) return "eq_both_sides";
  if (enc.left && Math.abs(safeNum(enc.left.a, 0)) > 1) return "eq_twostep";
  if (safeNum(enc.answer, 0) <= -25) return "eq_subzero_extreme";
  if (safeNum(enc.answer, 0) < 0) return "eq_cross_zero";
  return "eq_add";
}

export function classifyShrineArchetype(enc) {
  const kind = resolveEncounterKind(enc);
  if (
    kind === "eq_add" ||
    kind === "eq_cross_zero" ||
    kind === "eq_subzero_extreme" ||
    kind === "int_double_neg" ||
    kind === "int_polarity"
  ) {
    return "thermal_cauldron";
  }
  if (
    kind === "eq_twostep" ||
    kind === "eq_twostep_camo" ||
    kind === "eq_parens" ||
    kind === "eq_both_sides"
  ) {
    return "balance_bridge";
  }
  if (
    kind === "seq_linear" ||
    kind === "expr_distribute" ||
    kind === "exp_power" ||
    kind === "geo_parallel_angles" ||
    kind === "geo_scale_area"
  ) {
    return "conservatory_loom";
  }
  if (
    kind === "ramp_slope_only" ||
    kind === "ramp_linear" ||
    kind === "ramp_point_target" ||
    kind === "sys_intersection"
  ) {
    return "vine_rail";
  }
  if (
    kind === "geo_triangle_truss" ||
    kind === "geo_astrolabe_thales" ||
    kind === "geo_pythagoras" ||
    isSunbeamRatioKind(kind, enc)
  ) {
    return "moonwell_astrolabe";
  }
  if (kind === "quad_complete_sq" || kind === "arch_vertex_eval" || kind === "arch_roots") {
    return "mosaic_or_arch";
  }
  return "mitosis_or_portal";
}

export function normalizeCauldronMeta(enc) {
  const kind = resolveEncounterKind(enc);
  const rawEq = safeEqText(enc);
  const ans = safeNum(enc?.answer, 0);

  if (kind === "int_double_neg") {
    const m = rawEq.match(/(-?\d+)\s*-\s*\(\s*-(\d+)\s*\)/);
    const base = m ? Number(m[1]) : safeNum(enc?.startDial, ans - 5);
    const lift = m ? Number(m[2]) : Math.max(1, ans - base);
    return {
      mode: "vacuum_scoop",
      base,
      lift,
      answer: ans,
      scooped: safeNum(enc?.stepsUsed, 0) >= 1,
    };
  }

  if (kind === "int_polarity") {
    const m = rawEq.match(/\(\s*(-?\d+)\s*\)\s*[×x*]\s*\(\s*(-?\d+)\s*\)/);
    const factorA = m ? Number(m[1]) : -3;
    const factorB = m ? Number(m[2]) : -4;
    return {
      mode: "polarity_mirror",
      factorA,
      factorB,
      answer: ans,
      flipped: safeNum(enc?.stepsUsed, 0) >= 1,
    };
  }

  if (kind === "eq_subzero_extreme") {
    const m = rawEq.match(/(\d+)\s*-\s*(\d+)/);
    const posSeeds = m ? Number(m[1]) : 100;
    const negSpores = m ? Number(m[2]) : 200;
    return {
      mode: "subzero_abyss_brew",
      posSeeds,
      negSpores,
      leftB: safeNum(enc?.left?.b, 50),
      rhs: safeNum(enc?.right?.b, posSeeds - negSpores),
      answer: ans,
    };
  }

  return {
    mode: kind === "eq_cross_zero" ? "zero_pair_cross" : "solar_balance",
    leftB: safeNum(enc?.left?.b, 4),
    rhs: safeNum(enc?.right?.b, ans + safeNum(enc?.left?.b, 4)),
    answer: ans,
  };
}

export function normalizeBalanceMeta(enc) {
  const kind = resolveEncounterKind(enc);
  const leftA = safeNum(enc?.left?.a, safeNum(enc?.towers?.leftA, 1));
  const leftB = safeNum(enc?.left?.b, safeNum(enc?.towers?.leftB, 0));
  const rightA = safeNum(enc?.right?.a, safeNum(enc?.towers?.rightA, 0));
  const rightB = safeNum(enc?.right?.b, safeNum(enc?.towers?.rightB, safeNum(enc?.answer, 4)));
  const grouped = enc?.left?.grouped || null;
  return {
    mode: kind,
    leftA,
    leftB,
    rightA,
    rightB,
    grouped,
    isCamouflage: Boolean(enc?.isCamouflage || kind === "eq_twostep_camo"),
    answer: safeNum(enc?.answer, 2),
  };
}

export function normalizePatternMeta(enc) {
  const pm = enc?.patternMeta && typeof enc.patternMeta === "object" ? enc.patternMeta : {};
  const stepGrowth = safeNum(pm.stepGrowth, safeNum(pm.m, 3));
  const baseCount = safeNum(pm.baseCount, safeNum(pm.b, 2));
  const targetStep = safeNum(pm.targetStep, 10);
  const frames =
    Array.isArray(pm.frames) && pm.frames.length >= 3
      ? pm.frames.slice(0, 3).map((f, idx) => {
          const fObj = f && typeof f === "object" ? f : {};
          return {
            step: safeNum(fObj.step, idx + 1),
            base: safeNum(fObj.base, baseCount),
            groups: safeNum(fObj.groups, idx + 1),
            perGroup: safeNum(fObj.perGroup, stepGrowth),
            total: safeNum(fObj.total, safeNum(baseCount + (idx + 1) * stepGrowth, 0)),
          };
        })
      : [1, 2, 3].map((step) => ({
          step,
          base: baseCount,
          groups: step,
          perGroup: stepGrowth,
          total:
            Array.isArray(pm.terms) && Number.isFinite(pm.terms[step - 1])
              ? pm.terms[step - 1]
              : safeNum(baseCount + step * stepGrowth, 0),
        }));
  return {
    baseCount,
    stepGrowth,
    targetStep,
    frames,
    ruleVisual:
      typeof pm.ruleVisual === "string" && pm.ruleVisual
        ? pm.ruleVisual
        : "Base + Frame × Group",
    growthRevealed: safeNum(enc?.stepsUsed, 0) > 0,
  };
}

export function normalizeLoomOrScaleMeta(enc) {
  const kind = resolveEncounterKind(enc);
  const rawEq = safeEqText(enc);
  if (kind === "seq_linear") {
    return { mode: "pattern_pedestals", ...normalizePatternMeta(enc) };
  }
  if (kind === "expr_distribute") {
    const factor = Math.max(2, Math.abs(safeNum(enc?.towers?.leftA, 3)));
    const prodB = safeNum(enc?.towers?.leftB, 6);
    const innerB = Math.round(prodB / factor) || 2;
    return {
      mode: "crystal_loom",
      factor,
      innerB,
      unpacked: safeNum(enc?.stepsUsed, 0) >= 1,
      answer: safeNum(enc?.answer, 18),
    };
  }
  if (kind === "exp_power") {
    const m = rawEq.match(/(\d+)\s*\^\s*(\d+)/);
    const base = m ? Number(m[1]) : 3;
    const exp = m ? Number(m[2]) : 3;
    return { mode: "power_tree", base, exp, answer: safeNum(enc?.answer, safeNum(Math.pow(base, exp), 27)) };
  }
  if (kind === "geo_parallel_angles") {
    const am = enc?.astrolabeMeta && typeof enc.astrolabeMeta === "object" ? enc.astrolabeMeta : {};
    return {
      mode: "dew_mirrors",
      subMode: am.mode || "alt",
      given: safeNum(am.given, 65),
      answer: safeNum(am.target, safeNum(enc?.answer, 65)),
    };
  }
  // geo_scale_area
  const sm = enc?.scaleMeta && typeof enc.scaleMeta === "object" ? enc.scaleMeta : {};
  const mScale = rawEq.match(/=\s*(\d+)\s*m.*?k\s*=\s*(\d+)/i);
  const rawBaseArea = safeNum(sm.baseArea, mScale ? Number(mScale[1]) : 4);
  const baseArea = Math.max(1, Math.abs(rawBaseArea) || 4);
  const rawK =
    safeNum(sm.k, 0) > 0
      ? safeNum(sm.k, 2)
      : mScale
      ? Number(mScale[2])
      : Math.round(Math.sqrt(Math.max(4, Math.abs(safeNum(enc?.answer, 16))) / baseArea));
  const k = Math.max(2, safeNum(rawK, 2));
  return {
    mode: "scale_canopy",
    baseArea,
    k,
    answer: safeNum(enc?.answer, safeNum(baseArea * k * k, 16)),
    gridRevealed: safeNum(enc?.stepsUsed, 0) >= 1,
  };
}

export function normalizeVineMeta(enc, cachedInitial = null) {
  const kind = resolveEncounterKind(enc);
  if (kind === "sys_intersection") {
    const rm = enc?.rampMeta && typeof enc.rampMeta === "object" ? enc.rampMeta : null;
    if (rm?.isSystem && Number.isFinite(Number(rm.m2))) {
      const m1 = safeNum(rm.m, safeNum(enc?.left?.a, 3));
      const b1 = safeNum(rm.b, safeNum(enc?.left?.b, 2));
      const m2 = safeNum(rm.m2, safeNum(enc?.right?.a, 1));
      const targetX = safeNum(rm.targetX, safeNum(enc?.answer, 3));
      const b2 = safeNum(rm.b2, safeNum(enc?.right?.b, safeNum(m1 * targetX + b1 - m2 * targetX, 0)));
      const targetY = safeNum(rm.targetY, safeNum(m1 * targetX + b1, 5));
      return {
        isSystem: true,
        m1,
        b1,
        m2,
        b2,
        targetX,
        targetY,
        solveForB: false,
      };
    }
    if (cachedInitial?.isSystem) {
      return cachedInitial;
    }
    const xAns = safeNum(enc?.answer, 3);
    const m1 = safeNum(enc?.left?.a, 3);
    const b1 = safeNum(enc?.left?.b, 2);
    const m2 = safeNum(enc?.right?.a, 1);
    const b2 = safeNum(enc?.right?.b, safeNum(m1 * xAns + b1 - m2 * xAns, 0));
    return {
      isSystem: true,
      m1,
      b1,
      m2,
      b2,
      targetX: xAns,
      targetY: safeNum(m1 * xAns + b1, 5),
      solveForB: false,
    };
  }

  const rm = enc?.rampMeta && typeof enc.rampMeta === "object" ? enc.rampMeta : {};
  const m = safeNum(rm.m, safeNum(enc?.answer, 1));
  const b = safeNum(rm.b, 0);
  const targetX = safeNum(rm.targetX, 5);
  const targetY = safeNum(rm.targetY, safeNum(m * targetX + b, 5));
  return {
    isSystem: false,
    m,
    b,
    targetX,
    targetY,
    solveForB: Boolean(rm.solveForB || kind === "ramp_point_target"),
  };
}

export function normalizeMoonwellMeta(enc) {
  const kind = resolveEncounterKind(enc);
  const rawEq = safeEqText(enc);
  if (kind === "geo_astrolabe_thales") {
    const am = enc?.astrolabeMeta && typeof enc.astrolabeMeta === "object" ? enc.astrolabeMeta : {};
    const alpha = safeNum(am.alpha, 35);
    return {
      mode: "moonwell_thales",
      alpha,
      answer: safeNum(am.target, safeNum(enc?.answer, 90 - alpha)),
    };
  }
  if (kind === "geo_triangle_truss") {
    const am = enc?.astrolabeMeta && typeof enc.astrolabeMeta === "object" ? enc.astrolabeMeta : {};
    const a1 = safeNum(am.a1, 55);
    const a2 = safeNum(am.a2, 65);
    return {
      mode: "root_truss",
      a1,
      a2,
      answer: safeNum(am.target, safeNum(enc?.answer, 180 - a1 - a2)),
    };
  }
  if (isSunbeamRatioKind(kind, enc)) {
    const angMatch = rawEq.match(/(\d+)\s*°/);
    const fnMatch = rawEq.match(/\b(sin|cos|tan)\b/i);
    const angleDeg = angMatch ? Number(angMatch[1]) : 30;
    const ratioFn = fnMatch ? fnMatch[1].toLowerCase() : "sin";
    const span = safeNum(enc?.harpoonMeta?.hyp, 12);
    return {
      mode: "sunbeam_ratio",
      angleDeg,
      ratioFn,
      span,
      answer: safeNum(enc?.answer, 6),
    };
  }
  const hm = enc?.harpoonMeta && typeof enc.harpoonMeta === "object" ? enc.harpoonMeta : {};
  return {
    mode: "pythag_squares",
    legA: safeNum(hm.legA, 3),
    legB: safeNum(hm.legB, 4),
    hyp: safeNum(hm.hyp, safeNum(enc?.answer, 5)),
    answer: safeNum(enc?.answer, 5),
  };
}

export function normalizeMosaicOrArchMeta(enc) {
  const kind = resolveEncounterKind(enc);
  const rawEq = safeEqText(enc);
  if (kind === "quad_complete_sq") {
    const mB = rawEq.match(/([+-]?\s*\d+)\s*x\b/i);
    const parsedB = mB ? Number(mB[1].replace(/\s+/g, "")) : NaN;
    const bCoeff = Math.max(
      2,
      Math.abs(safeNum(enc?.towers?.leftB, safeNum(parsedB, safeNum(enc?.startDial, 6))))
    );
    const half = bCoeff / 2;
    return {
      mode: "mosaic_forge",
      bCoeff,
      half,
      answer: safeNum(enc?.answer, half * half),
      wingsSplit: safeNum(enc?.stepsUsed, 0) >= 1,
    };
  }
  const am = enc?.archMeta && typeof enc.archMeta === "object" ? enc.archMeta : {};
  return {
    mode: kind === "arch_vertex_eval" ? "spore_arch_vertex" : "spore_arch_roots",
    a: safeNum(am.a, -0.5),
    h: safeNum(am.h, 4),
    k: safeNum(am.k, 8),
    r1: safeNum(am.r1, 0),
    r2: safeNum(am.r2, 8),
    answer: safeNum(enc?.answer, safeNum(am.k, 8)),
  };
}

export function normalizeW7Meta(enc) {
  const kind = resolveEncounterKind(enc);
  const rawEq = safeEqText(enc);

  if (kind === "complex_i_rotation") {
    const pm =
      (enc?.portalMeta && typeof enc.portalMeta === "object" ? enc.portalMeta : null) ||
      (enc?.iPortalMeta && typeof enc.iPortalMeta === "object" ? enc.iPortalMeta : null) ||
      {};
    const mLead = rawEq.match(/\(?(-?\d+)\)?\s*[·*×]?\s*i(?:\^\d+|[²³⁴]|\b)/);
    const mTrail = rawEq.match(/i(?:\^\d+|[²³⁴])?\s*[·*×]\s*\(?\s*(-?\d+)\s*\)?/);
    const parsedReal = mLead ? Number(mLead[1]) : mTrail ? Number(mTrail[1]) : NaN;
    const fallbackMag = Math.max(1, Math.abs(safeNum(enc?.answer, 4)) || 4);

    const pmStartReal = safeNum(pm.startReal, 0);
    const startReal =
      pmStartReal !== 0
        ? pmStartReal
        : Number.isFinite(parsedReal) && parsedReal !== 0
        ? parsedReal
        : fallbackMag;

    let quarterTurns = safeNum(pm.quarterTurns, safeNum(pm.iPower, NaN));
    if (!Number.isFinite(quarterTurns)) {
      const powMatch =
        rawEq.match(/i\^(\d+)/) ||
        (rawEq.includes("i²")
          ? [null, "2"]
          : rawEq.includes("i³")
          ? [null, "3"]
          : rawEq.includes("i⁴")
          ? [null, "4"]
          : null);
      quarterTurns = powMatch ? Number(powMatch[1]) : 2;
    }
    quarterTurns = Math.max(1, Math.round(Math.abs(safeNum(quarterTurns, 2)) || 2));

    const startAngleDeg = safeNum(pm.startAngleDeg, startReal < 0 ? 180 : 0);
    const rMag = Math.abs(startReal);
    const endAngleDeg = (((startAngleDeg + quarterTurns * 90) % 360) + 360) % 360;
    const endRad = (endAngleDeg * Math.PI) / 180;
    const calcEndReal = Math.round(rMag * Math.cos(endRad) * 1e6) / 1e6 || 0;
    const calcEndImag = Math.round(rMag * Math.sin(endRad) * 1e6) / 1e6 || 0;

    return {
      mode: "i_portal",
      startReal,
      startAngleDeg,
      quarterTurns,
      iPower: pm.iPower ?? quarterTurns,
      angleDeg: safeNum(pm.angleDeg, endAngleDeg),
      endReal: safeNum(pm.endReal, calcEndReal),
      endImag: safeNum(pm.endImag, calcEndImag),
      answer: safeNum(enc?.answer, calcEndReal !== 0 ? calcEndReal : calcEndImag),
    };
  }

  if (kind === "exp_growth") {
    const gm = enc?.growthMeta && typeof enc.growthMeta === "object" ? enc.growthMeta : {};
    const m = rawEq.match(/(\d+)\s*[·*×]\s*\(?(\d+)\^(\d+)\)?/);
    const a0 = safeNum(gm.a0, m ? Number(m[1]) : Math.max(1, safeNum(enc?.startDial, 2)));
    const ratio = safeNum(gm.ratio, m ? Number(m[2]) : 2);
    const stages = safeNum(gm.x, m ? Number(m[3]) : 3);
    return {
      mode: "mitosis_puffballs",
      a0,
      ratio,
      stages,
      target: safeNum(enc?.answer, safeNum(a0 * Math.pow(ratio, stages), 16)),
    };
  }

  if (kind === "log_stage") {
    const lm = enc?.logMeta && typeof enc.logMeta === "object" ? enc.logMeta : {};
    const m = rawEq.match(/log_(\d+)\((\d+)\)/);
    const base = safeNum(lm.base, m ? Number(m[1]) : 2);
    const stage = safeNum(lm.stage, Math.max(1, safeNum(enc?.answer, 3)));
    const target = safeNum(lm.target, m ? Number(m[2]) : safeNum(Math.pow(base, stage), 8));
    return { mode: "log_spire", base, stage, target };
  }

  const midline = safeNum(enc?.startDial, 5);
  const crest = safeNum(enc?.answer, 9);
  const amplitude = Math.max(1, Math.abs(crest - midline));
  return { mode: "harmonic_wave", midline, amplitude, crest };
}

export class OddrootShrineManager {
  constructor({
    scene,
    audio = null,
    toonGradientMap = null,
    getTerrainHeight = null,
  } = {}) {
    this.scene = scene;
    this.audio = audio;
    this.toonGradientMap = toonGradientMap || createOddrootToonGradient();
    this.getTerrainHeight = getTerrainHeight || (() => 0.0);

    this.slots = [];
    this.steamPoofPool = [];
    this.siphonArcPool = [];
    this.amberSparkPool = [];
    this.twinBeams = [];

    this._tmpObj = new THREE.Object3D();
    this._tmpVecA = new THREE.Vector3();
    this._tmpVecB = new THREE.Vector3();

    this._initSharedMaterialsAndPools();
  }

  _initSharedMaterialsAndPools() {
    const g = this.toonGradientMap;
    this.mats = {
      mossStone: createOddrootToonRimMaterial(g, {
        color: 0x294840,
        emissive: 0x0d241e,
        emissiveIntensity: 0.25,
        rimColor: 0x5ef2c8,
        rimIntensity: 0.3,
      }),
      bronze: createOddrootToonRimMaterial(g, {
        color: 0x765436,
        emissive: 0x2c1b0e,
        emissiveIntensity: 0.28,
        rimColor: 0xffd166,
        rimIntensity: 0.38,
      }),
      brass: createOddrootToonRimMaterial(g, {
        color: 0xe6b44c,
        emissive: 0x925e14,
        emissiveIntensity: 0.44,
        rimColor: 0xfff3b0,
        rimIntensity: 0.5,
      }),
      sunGold: createOddrootToonRimMaterial(g, {
        color: 0xf5c451,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.65,
        rimColor: 0xfff3b0,
        rimIntensity: 0.55,
      }),
      frostCyan: createOddrootToonRimMaterial(g, {
        color: 0x4ad8ff,
        emissive: 0x0284c7,
        emissiveIntensity: 0.62,
        rimColor: 0xbae6fd,
        rimIntensity: 0.55,
      }),
      runeEmerald: createOddrootToonRimMaterial(g, {
        color: 0x3bf0c5,
        emissive: 0x0d9488,
        emissiveIntensity: 0.62,
        rimColor: 0x99f6e4,
        rimIntensity: 0.52,
      }),
      heliumViolet: createOddrootToonRimMaterial(g, {
        color: 0xc074ff,
        emissive: 0x7e22ce,
        emissiveIntensity: 0.62,
        rimColor: 0xe9d5ff,
        rimIntensity: 0.55,
      }),
      silverMoon: createOddrootToonRimMaterial(g, {
        color: 0xe2f8f5,
        emissive: 0x62f5e4,
        emissiveIntensity: 0.72,
        rimColor: 0xffffff,
        rimIntensity: 0.6,
      }),
      crystalGlass: new THREE.MeshBasicMaterial({
        color: 0x7ee8fa,
        transparent: true,
        opacity: 0.32,
        side: THREE.DoubleSide,
      }),
      caliperAmber: new THREE.MeshBasicMaterial({
        color: 0xffc857,
        transparent: true,
        opacity: 0.92,
      }),
      sporeGel: new THREE.MeshToonMaterial({
        color: 0xe86af0,
        emissive: 0xc026d3,
        emissiveIntensity: 0.65,
        gradientMap: g,
      }),
      beaconGlow: new THREE.MeshBasicMaterial({
        color: 0x5ef2c8,
        transparent: true,
        opacity: 0.24,
        side: THREE.DoubleSide,
      }),
    };

    this.geos = {
      orb: new THREE.SphereGeometry(0.32, 12, 10),
      frostCore: new THREE.OctahedronGeometry(0.34, 0),
      runePod: new THREE.CapsuleGeometry(0.28, 0.42, 5, 10),
      heliumPuff: new THREE.DodecahedronGeometry(0.4, 1),
      baseStone: new THREE.DodecahedronGeometry(0.26, 0),
      petal: new THREE.OctahedronGeometry(0.23, 0),
      vineSeg: new THREE.CylinderGeometry(0.18, 0.22, 1.0, 8),
      spark: new THREE.OctahedronGeometry(0.2, 0),
      poof: new THREE.DodecahedronGeometry(0.32, 0),
    };

    this.poolGroup = new THREE.Group();
    this.poolGroup.name = "OddrootShrinePools";
    if (this.scene) {
      this.scene.add(this.poolGroup);
    }

    for (let i = 0; i < 48; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xf8fafc,
        transparent: true,
        opacity: 0.88,
      });
      const mesh = new THREE.Mesh(this.geos.poof, mat);
      mesh.visible = false;
      this.poolGroup.add(mesh);
      this.steamPoofPool.push({
        active: false,
        elapsed: 0,
        dur: 0.65,
        vx: 0,
        vy: 0,
        vz: 0,
        mesh,
        mat,
      });
    }

    for (let i = 0; i < 36; i++) {
      const mesh = new THREE.Mesh(this.geos.orb, this.mats.sunGold);
      mesh.visible = false;
      this.poolGroup.add(mesh);
      this.siphonArcPool.push({
        active: false,
        elapsed: 0,
        dur: 0.5,
        p0: new THREE.Vector3(),
        p1: new THREE.Vector3(),
        p2: new THREE.Vector3(),
        mesh,
      });
    }

    for (let i = 0; i < 32; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffb74d,
        transparent: true,
        opacity: 0.95,
      });
      const mesh = new THREE.Mesh(this.geos.spark, mat);
      mesh.visible = false;
      this.poolGroup.add(mesh);
      this.amberSparkPool.push({
        active: false,
        elapsed: 0,
        dur: 0.48,
        vx: 0,
        vy: 0,
        vz: 0,
        mesh,
        mat,
      });
    }

    const beamGeo = new THREE.CylinderGeometry(0.08, 0.11, 1.0, 8);
    for (let i = 0; i < 2; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x3bf0c5,
        transparent: true,
        opacity: 0.88,
      });
      const mesh = new THREE.Mesh(beamGeo, mat);
      mesh.visible = false;
      this.poolGroup.add(mesh);
      this.twinBeams.push({
        active: false,
        elapsed: 0,
        dur: 0.42,
        mesh,
        mat,
      });
    }
  }

  _spawnSteamPoofs(worldPos, count = 12) {
    let spawned = 0;
    for (let i = 0; i < this.steamPoofPool.length && spawned < count; i++) {
      const p = this.steamPoofPool[i];
      if (p.active) continue;
      const ang = (spawned / Math.max(1, count)) * Math.PI * 2;
      p.active = true;
      p.elapsed = 0;
      p.dur = 0.68;
      p.vx = Math.cos(ang) * (1.2 + (spawned % 3) * 0.4);
      p.vy = 2.4 + (spawned % 4) * 0.55;
      p.vz = Math.sin(ang) * (1.2 + (spawned % 3) * 0.4);
      p.mesh.position.copy(worldPos);
      p.mesh.scale.setScalar(0.55);
      p.mat.opacity = 0.9;
      p.mesh.visible = true;
      spawned++;
    }
  }

  _spawnAmberSparks(worldPos, count = 18) {
    let spawned = 0;
    for (let i = 0; i < this.amberSparkPool.length && spawned < count; i++) {
      const s = this.amberSparkPool[i];
      if (s.active) continue;
      const ang = (spawned / Math.max(1, count)) * Math.PI * 2;
      s.active = true;
      s.elapsed = 0;
      s.dur = 0.5;
      s.vx = Math.cos(ang) * (2.6 + (spawned % 3) * 0.8);
      s.vy = 2.0 + (spawned % 4) * 0.6;
      s.vz = Math.sin(ang) * (2.6 + (spawned % 3) * 0.8);
      s.mesh.position.copy(worldPos);
      s.mat.opacity = 0.95;
      s.mesh.visible = true;
      spawned++;
    }
  }

  _spawnArcOrb(startWorld, endWorld, mat, arcLift = 2.6, dur = 0.48) {
    const slot = this.siphonArcPool.find((o) => !o.active) || this.siphonArcPool[0];
    slot.active = true;
    slot.elapsed = 0;
    slot.dur = dur;
    slot.p0.copy(startWorld);
    slot.p2.copy(endWorld);
    slot.p1
      .copy(startWorld)
      .add(endWorld)
      .multiplyScalar(0.5);
    slot.p1.y += arcLift;
    slot.mesh.material = mat;
    slot.mesh.position.copy(startWorld);
    slot.mesh.visible = true;
    return slot;
  }

  _createCaliperGroup() {
    const grp = new THREE.Group();
    grp.name = "ShrineDeltaCaliper";
    grp.visible = false;

    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.0, 0.18), this.mats.caliperAmber);
    grp.add(bar);
    const capTop = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, 0.22), this.mats.caliperAmber);
    capTop.position.y = 0.5;
    grp.add(capTop);
    const capBot = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, 0.22), this.mats.caliperAmber);
    capBot.position.y = -0.5;
    grp.add(capBot);

    grp.userData = { bar, capTop, capBot };
    return grp;
  }

  _positionCaliperVertical(caliperGrp, x, yA, yB, z) {
    const span = Math.max(0.45, Math.abs(yB - yA));
    const midY = (yA + yB) * 0.5;
    caliperGrp.position.set(x, midY, z);
    caliperGrp.userData.bar.scale.set(1, span, 1);
    caliperGrp.userData.capTop.position.y = span * 0.5;
    caliperGrp.userData.capBot.position.y = -span * 0.5;
    caliperGrp.visible = true;
  }

  populateEncounters(encounters = [], anchorCoords = []) {
    for (const prev of this.slots) {
      if (prev.group && this.scene) {
        this.scene.remove(prev.group);
      }
    }
    this.slots = [];

    const list = Array.isArray(encounters) ? encounters : [];
    for (let i = 0; i < list.length; i++) {
      const enc = list[i];
      if (!enc) continue;
      const anchor = anchorCoords[i % Math.max(1, anchorCoords.length)] || {
        x: 0,
        y: 0,
        z: -15 - i * 10,
        rotY: 0,
      };
      const y = Number.isFinite(anchor.y) ? anchor.y : this.getTerrainHeight(anchor.x, anchor.z);
      const kind = resolveEncounterKind(enc);
      const archetype = classifyShrineArchetype(enc);

      const group = new THREE.Group();
      group.name = `OddrootShrine_${enc.nodeId || i}`;
      group.position.set(anchor.x, y, anchor.z);
      group.rotation.y = safeNum(anchor.rotY, 0);

      const approachRing = new THREE.Mesh(
        new THREE.TorusGeometry(2.3, 0.12, 8, 28),
        this.mats.runeEmerald
      );
      approachRing.rotation.x = Math.PI / 2;
      approachRing.position.set(0, 0.14, 6.0);
      group.add(approachRing);

      const beaconMat = this.mats.beaconGlow.clone();
      const beaconPillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.85, 16.0, 12, 1, true),
        beaconMat
      );
      beaconPillar.position.set(0, 8.0, 0);
      group.add(beaconPillar);

      const caliperMesh = this._createCaliperGroup();
      group.add(caliperMesh);

      const contentGroup = new THREE.Group();
      contentGroup.name = "ShrineManipulativeContent";
      group.add(contentGroup);

      const slot = {
        index: i,
        encounter: enc,
        kind,
        archetype,
        x: anchor.x,
        y,
        z: anchor.z,
        rotY: safeNum(anchor.rotY, 0),
        cleared: false,
        group,
        contentGroup,
        approachRing,
        beaconPillar,
        beaconMat,
        caliperMesh,
        splatterMesh: null,
        sporeSplatterMesh: null,
        originStub: null,
        tangentStub: null,
        stubSpanRatio: SHRINE_STUB_SPAN_Z / SHRINE_CHASM_SPAN_Z,
        extrudedVine: null,
        extrudedBridge: null,
        initialSystemMeta: kind === "sys_intersection" ? normalizeVineMeta(enc) : null,
        cauldronState: null,
        balanceState: null,
        loomState: null,
        vineState: null,
        moonwellState: null,
        mosaicState: null,
        w7State: null,
      };

      this._buildShrineArchetypeIntoSlot(slot);
      if (this.scene) {
        this.scene.add(group);
      }
      this.slots.push(slot);
    }

    return this.slots;
  }

  areAllEncountersCleared() {
    return this.slots.length > 0 && this.slots.every((s) => s.cleared);
  }

  _resetSlotSubStates(slot) {
    while (slot.contentGroup.children.length > 0) {
      slot.contentGroup.remove(slot.contentGroup.children[0]);
    }
    slot.splatterMesh = null;
    slot.sporeSplatterMesh = null;
    slot.originStub = null;
    slot.tangentStub = null;
    slot.extrudedVine = null;
    slot.extrudedBridge = null;
    slot.cauldronState = null;
    slot.balanceState = null;
    slot.loomState = null;
    slot.vineState = null;
    slot.moonwellState = null;
    slot.mosaicState = null;
    slot.w7State = null;
    slot.caliperMesh.visible = false;
  }

  _buildShrineArchetypeIntoSlot(slot) {
    this._resetSlotSubStates(slot);
    slot.kind = resolveEncounterKind(slot.encounter);
    slot.archetype = classifyShrineArchetype(slot.encounter);

    switch (slot.archetype) {
      case "thermal_cauldron":
        this._buildThermalCauldron(slot);
        break;
      case "balance_bridge":
        this._buildBalanceBridge(slot);
        break;
      case "conservatory_loom":
        this._buildConservatoryLoom(slot);
        break;
      case "vine_rail":
        this._buildVineRail(slot);
        break;
      case "moonwell_astrolabe":
        this._buildMoonwellAstrolabe(slot);
        break;
      case "mosaic_or_arch":
        this._buildMosaicOrArch(slot);
        break;
      default:
        this._buildMitosisOrPortal(slot);
        break;
    }
  }

  // 1. W0-W1 Unclamped Zero-Pair Thermal Cauldrons (-500..+500)
  _buildThermalCauldron(slot) {
    const meta = normalizeCauldronMeta(slot.encounter);
    const cg = slot.contentGroup;

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6, 3.0, 0.5, 16),
      this.mats.mossStone
    );
    pedestal.position.y = 0.25;
    cg.add(pedestal);

    const cauldronPot = new THREE.Mesh(
      new THREE.CylinderGeometry(2.05, 1.55, 2.0, 16),
      this.mats.bronze
    );
    cauldronPot.position.set(0, 1.35, 0);
    cg.add(cauldronPot);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.18, 10, 28), this.mats.brass);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, 2.35, 0);
    cg.add(rim);

    const subZeroShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.62, 4.6, 14),
      this.mats.crystalGlass
    );
    subZeroShaft.position.set(0, 2.5, -2.35);
    cg.add(subZeroShaft);

    const zeroHorizonRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.76, 0.08, 8, 24),
      this.mats.silverMoon
    );
    zeroHorizonRing.rotation.x = Math.PI / 2;
    zeroHorizonRing.position.set(0, 2.5, -2.35);
    cg.add(zeroHorizonRing);

    const initialTemp =
      meta.mode === "vacuum_scoop"
        ? meta.scooped
          ? meta.base + meta.lift
          : meta.base
        : safeNum(slot.encounter?.startDial, 0);
    const levelY = elixirLevelToY(initialTemp);

    const elixirMat = (initialTemp < 0 ? this.mats.frostCyan : this.mats.sunGold).clone();
    const elixirColumn = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 1.0, 12), elixirMat);
    const colSpan = Math.max(0.2, Math.abs(levelY - 2.5));
    elixirColumn.scale.set(1, colSpan, 1);
    elixirColumn.position.set(0, levelY, -2.35);
    cg.add(elixirColumn);

    const elixirSurface = new THREE.Mesh(new THREE.CylinderGeometry(1.78, 1.65, 0.24, 16), elixirMat);
    elixirSurface.position.set(0, levelY * 0.55 + 0.6, 0);
    cg.add(elixirSurface);

    const fireSeedCluster = new THREE.Group();
    fireSeedCluster.position.set(-3.1, 1.1, 0.6);
    for (let i = 0; i < 5; i++) {
      const orb = new THREE.Mesh(this.geos.orb, this.mats.sunGold);
      orb.position.set(((i % 3) - 1) * 0.45, Math.floor(i / 3) * 0.45, 0);
      fireSeedCluster.add(orb);
    }
    cg.add(fireSeedCluster);

    const frostSporeCluster = new THREE.Group();
    frostSporeCluster.position.set(3.1, 1.1, 0.6);
    for (let i = 0; i < 5; i++) {
      const sp = new THREE.Mesh(this.geos.frostCore, this.mats.frostCyan);
      sp.position.set(((i % 3) - 1) * 0.45, Math.floor(i / 3) * 0.45, 0);
      frostSporeCluster.add(sp);
    }
    cg.add(frostSporeCluster);

    const submergedSpores = new THREE.Group();
    submergedSpores.position.set(0, 1.85, 0);
    if (meta.mode === "vacuum_scoop" && !meta.scooped) {
      const count = Math.min(8, Math.max(2, Math.abs(meta.lift)));
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * Math.PI * 2;
        const sp = new THREE.Mesh(this.geos.frostCore, this.mats.frostCyan);
        sp.position.set(Math.cos(ang) * 0.85, 0, Math.sin(ang) * 0.85);
        submergedSpores.add(sp);
      }
    } else {
      submergedSpores.visible = false;
    }
    cg.add(submergedSpores);

    const polarityMirror = new THREE.Group();
    polarityMirror.position.set(0, 4.3, 0);
    polarityMirror.visible = meta.mode === "polarity_mirror";
    const pRing = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.12, 8, 28), this.mats.brass);
    polarityMirror.add(pRing);
    const pCore = new THREE.Mesh(
      this.geos.orb,
      meta.answer >= 0 ? this.mats.sunGold : this.mats.frostCyan
    );
    pCore.scale.setScalar(1.4);
    polarityMirror.add(pCore);
    if (meta.flipped) {
      polarityMirror.rotation.z = Math.PI;
    }
    cg.add(polarityMirror);

    const previewVial = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.85, 10),
      this.mats.runeEmerald.clone()
    );
    previewVial.position.set(0, 1.1, 3.2);
    cg.add(previewVial);

    const skyChest = new THREE.Group();
    skyChest.position.set(0, 8.2, 0);
    const chestBox = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.78, 0.88), this.mats.bronze);
    skyChest.add(chestBox);
    const chestLid = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.28, 0.9), this.mats.brass);
    chestLid.position.set(0, 0.5, 0);
    skyChest.add(chestLid);
    skyChest.visible = meta.answer < 0;
    cg.add(skyChest);

    const hatchedToad = new THREE.Group();
    hatchedToad.position.set(0, 2.35, 0);
    hatchedToad.rotation.z = Math.PI;
    hatchedToad.visible = false;
    const toadBody = new THREE.Mesh(new THREE.SphereGeometry(0.52, 12, 10), this.mats.frostCyan);
    hatchedToad.add(toadBody);
    cg.add(hatchedToad);

    if (meta.mode === "subzero_abyss_brew") {
      slot.group.updateMatrixWorld(true);
      this._tmpVecA.set(3.1, 2.1, 0.6).applyMatrix4(slot.group.matrixWorld);
      this._spawnSteamPoofs(this._tmpVecA, 8);
    }

    slot.cauldronState = {
      mode: meta.mode,
      meta,
      cauldronPot,
      subZeroShaft,
      zeroHorizonRing,
      elixirColumn,
      elixirSurface,
      elixirMat,
      fireSeedCluster,
      frostSporeCluster,
      submergedSpores,
      polarityMirror,
      previewVial,
      skyChest,
      chestLid,
      hatchedToad,
      toadAscending: false,
      toadVy: 0,
      chestBonked: false,
      currentTemp: initialTemp,
    };
  }

  _setCauldronTemperature(cauldronState, temp) {
    const levelY = elixirLevelToY(temp);
    cauldronState.currentTemp = temp;
    cauldronState.elixirColumn.position.y = levelY;
    cauldronState.elixirColumn.scale.y = Math.max(0.2, Math.abs(levelY - 2.5));
    cauldronState.elixirSurface.position.y = levelY * 0.55 + 0.6;
    if (temp < 0) {
      cauldronState.elixirMat.color.setHex(0x4ad8ff);
      cauldronState.elixirMat.emissive.setHex(0x0284c7);
    } else if (temp > 0) {
      cauldronState.elixirMat.color.setHex(0xf5c451);
      cauldronState.elixirMat.emissive.setHex(0xf59e0b);
    } else {
      cauldronState.elixirMat.color.setHex(0x62f5e4);
      cauldronState.elixirMat.emissive.setHex(0x0d9488);
    }
  }

  // 2. W1-W3 Swaying Rune-Pod Balance Bridges
  _buildBalanceBridge(slot) {
    const meta = normalizeBalanceMeta(slot.encounter);
    const cg = slot.contentGroup;

    const fulcrumArch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.85, 4.2, 10),
      this.mats.mossStone
    );
    fulcrumArch.position.set(0, 2.1, 0);
    cg.add(fulcrumArch);

    const beamPivot = new THREE.Group();
    beamPivot.name = "BalanceBeamPivot";
    beamPivot.position.set(0, 4.2, 0);
    cg.add(beamPivot);

    const crossbar = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.28, 0.42), this.mats.brass);
    beamPivot.add(crossbar);

    const buildPanContents = (panGroup, aCoeff, bConst, groupedSpec, isRepelTarget) => {
      const constCluster = new THREE.Group();
      const varCluster = new THREE.Group();
      panGroup.add(constCluster);
      panGroup.add(varCluster);

      if (groupedSpec && Math.abs(groupedSpec.factor) >= 2) {
        const cages = Math.min(5, Math.abs(groupedSpec.factor));
        for (let c = 0; c < cages; c++) {
          const cage = new THREE.Mesh(
            new THREE.BoxGeometry(0.92, 0.82, 0.82),
            this.mats.crystalGlass
          );
          cage.position.set((c - (cages - 1) / 2) * 1.0, 0.55, 0);
          varCluster.add(cage);
          const pod = new THREE.Mesh(this.geos.runePod, this.mats.runeEmerald);
          pod.position.copy(cage.position);
          varCluster.add(pod);
        }
      } else {
        const podCount = Math.min(8, Math.abs(Math.round(aCoeff)));
        for (let i = 0; i < podCount; i++) {
          if (aCoeff > 0) {
            const pod = new THREE.Mesh(this.geos.runePod, this.mats.runeEmerald);
            pod.position.set(-0.55 + (i % 3) * 0.42, 0.45 + Math.floor(i / 3) * 0.62, -0.2);
            varCluster.add(pod);
          } else {
            // Buoyant -x Helium Puff floating ABOVE pan on glowing tether!
            const puff = new THREE.Mesh(this.geos.heliumPuff, this.mats.heliumViolet);
            const px = 0.45 + (i % 3) * 0.48;
            const py = 1.95 + Math.floor(i / 3) * 0.55;
            puff.position.set(px, py, 0.15);
            varCluster.add(puff);
            const tether = new THREE.Mesh(
              new THREE.CylinderGeometry(0.03, 0.03, py - 0.15, 6),
              this.mats.heliumViolet
            );
            tether.position.set(px, py * 0.5, 0.15);
            varCluster.add(tether);
          }
        }

        const orbCount = Math.min(10, Math.abs(Math.round(bConst)));
        const orbMat = bConst >= 0 ? this.mats.sunGold : this.mats.frostCyan;
        const orbGeo = bConst >= 0 ? this.geos.orb : this.geos.frostCore;
        for (let i = 0; i < orbCount; i++) {
          const m = new THREE.Mesh(orbGeo, orbMat);
          m.position.set(-0.65 + (i % 4) * 0.42, 0.35 + Math.floor(i / 4) * 0.42, 0.28);
          constCluster.add(m);
        }
      }

      return isRepelTarget ? { constCluster, varCluster } : null;
    };

    const makePan = (xPos) => {
      const panRoot = new THREE.Group();
      panRoot.position.set(xPos, -1.8, 0);
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 6), this.mats.brass);
      cord.position.y = 0.9;
      panRoot.add(cord);
      const tray = new THREE.Mesh(
        new THREE.CylinderGeometry(1.65, 1.35, 0.24, 16),
        this.mats.bronze
      );
      panRoot.add(tray);
      beamPivot.add(panRoot);
      return panRoot;
    };

    const leftPan = makePan(-4.2);
    const rightPan = makePan(4.2);

    const repelLeft = buildPanContents(
      leftPan,
      meta.leftA,
      meta.leftB,
      meta.grouped,
      meta.isCamouflage && meta.leftA !== 0 && meta.leftB !== 0
    );
    const repelRight = buildPanContents(
      rightPan,
      meta.rightA,
      meta.rightB,
      null,
      meta.isCamouflage || (meta.rightA !== 0 && meta.rightB !== 0)
    );
    const repelHandles = repelRight ||
      repelLeft || {
        constCluster: rightPan.children[2] || new THREE.Group(),
        varCluster: rightPan.children[3] || new THREE.Group(),
      };

    const repelSparkRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.1, 8, 24),
      this.mats.caliperAmber
    );
    repelSparkRing.position.set(4.2, 2.8, 0);
    repelSparkRing.visible = false;
    cg.add(repelSparkRing);

    const bridgePlanks = new THREE.Group();
    bridgePlanks.visible = false;
    for (let p = 0; p < 7; p++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.22, 1.1), this.mats.sunGold);
      plank.position.set(0, 0.35, 3.2 - p * 1.4);
      bridgePlanks.add(plank);
    }
    cg.add(bridgePlanks);

    const previewCrystal = new THREE.Mesh(this.geos.frostCore, this.mats.runeEmerald.clone());
    previewCrystal.position.set(0, 1.25, 3.4);
    cg.add(previewCrystal);

    slot.balanceState = {
      mode: meta.mode,
      meta,
      fulcrumArch,
      beamPivot,
      leftPan,
      rightPan,
      bridgePlanks,
      previewCrystal,
      repelConstantCluster: repelHandles.constCluster,
      repelVariableCluster: repelHandles.varCluster,
      repelSparkRing,
      repelAnim: null,
      theta: 0,
      omega: 0,
      targetTheta: 0,
    };
  }

  // 3. W2 Pattern Conservatory & Equivalence Looms
  _buildConservatoryLoom(slot) {
    const meta = normalizeLoomOrScaleMeta(slot.encounter);
    const cg = slot.contentGroup;

    const previewGem = new THREE.Mesh(this.geos.petal, this.mats.sunGold.clone());
    previewGem.position.set(0, 1.15, 3.3);
    cg.add(previewGem);

    const state = {
      mode: meta.mode,
      meta,
      previewGem,
      framePedestals: [],
      targetPedestal: null,
      loomPodGroup: null,
      loomOrbGroup: null,
      unpacked: Boolean(meta.unpacked),
      treeInstancedMesh: null,
      canopyInstancedMesh: null,
      protractorPrism: null,
    };

    if (meta.mode === "pattern_pedestals") {
      // 3D Botanical Frame Pedestals: Constant Base Stones + Frame * Per-Frame Growing Rows
      const xCoords = [-4.4, 0.0, 4.4];
      for (let i = 0; i < 3; i++) {
        const frameSpec = meta.frames[i];
        const pedRoot = new THREE.Group();
        pedRoot.position.set(xCoords[i], 0, 0);

        const col = new THREE.Mesh(
          new THREE.CylinderGeometry(1.35, 1.55, 0.9, 14),
          this.mats.mossStone
        );
        col.position.y = 0.45;
        pedRoot.add(col);

        const baseStoneGroup = new THREE.Group();
        baseStoneGroup.name = `Frame_${frameSpec.step}_BaseStones`;
        const absBase = Math.min(12, Math.abs(Math.round(frameSpec.base)));
        const stoneMat = frameSpec.base >= 0 ? this.mats.sunGold : this.mats.frostCyan;
        for (let b = 0; b < absBase; b++) {
          const ang = (b / Math.max(1, absBase)) * Math.PI * 2;
          const stone = new THREE.Mesh(this.geos.baseStone, stoneMat);
          stone.position.set(Math.cos(ang) * 0.85, 1.06, Math.sin(ang) * 0.85);
          baseStoneGroup.add(stone);
        }
        pedRoot.add(baseStoneGroup);

        const growthRowGroups = [];
        const groupsCount = Math.max(1, Math.min(5, Math.round(frameSpec.groups)));
        const perGroup = Math.max(1, Math.min(8, Math.abs(Math.round(frameSpec.perGroup))));
        for (let gIdx = 0; gIdx < groupsCount; gIdx++) {
          const rowGrp = new THREE.Group();
          rowGrp.position.set(0, 1.62 + gIdx * 0.58, 0);
          for (let p = 0; p < perGroup; p++) {
            const px = (p - (perGroup - 1) / 2) * 0.42;
            const petal = new THREE.Mesh(this.geos.petal, this.mats.runeEmerald);
            petal.position.set(px, 0, 0);
            rowGrp.add(petal);
          }
          if (meta.growthRevealed) {
            const bracket = new THREE.Mesh(
              new THREE.TorusGeometry(0.82, 0.04, 6, 20),
              this.mats.brass
            );
            bracket.rotation.x = Math.PI / 2;
            rowGrp.add(bracket);
          }
          pedRoot.add(rowGrp);
          growthRowGroups.push(rowGrp);
        }

        cg.add(pedRoot);
        state.framePedestals.push({
          step: frameSpec.step,
          root: pedRoot,
          baseStoneGroup,
          growthRowGroups,
        });
      }

      const targetPedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(1.6, 1.85, 1.1, 16),
        this.mats.brass
      );
      targetPedestal.position.set(0, 0.55, -3.5);
      cg.add(targetPedestal);
      state.targetPedestal = targetPedestal;
    } else if (meta.mode === "crystal_loom") {
      // W2.2 Distributive Crystal Loom: a(n ± b) -> an ± ab
      const frame = new THREE.Mesh(new THREE.BoxGeometry(6.8, 4.6, 0.35), this.mats.bronze);
      frame.position.set(0, 2.4, -0.4);
      cg.add(frame);

      const loomPodGroup = new THREE.Group();
      const loomOrbGroup = new THREE.Group();
      const rows = Math.min(6, Math.max(2, meta.factor));
      const cols = Math.min(6, Math.max(1, Math.abs(meta.innerB)));
      const orbMat = meta.innerB >= 0 ? this.mats.sunGold : this.mats.frostCyan;

      for (let r = 0; r < rows; r++) {
        const yRow = 1.1 + r * 0.62;
        const pod = new THREE.Mesh(this.geos.runePod, this.mats.runeEmerald);
        pod.position.set(0, yRow, 0.15);
        loomPodGroup.add(pod);

        for (let c = 0; c < cols; c++) {
          const orb = new THREE.Mesh(this.geos.orb, orbMat);
          orb.position.set(c * 0.52, yRow, 0.15);
          loomOrbGroup.add(orb);
        }
      }

      loomPodGroup.position.x = meta.unpacked ? -2.3 : -0.45;
      loomOrbGroup.position.x = meta.unpacked ? 1.55 : 0.35;
      cg.add(loomPodGroup);
      cg.add(loomOrbGroup);
      state.loomPodGroup = loomPodGroup;
      state.loomOrbGroup = loomOrbGroup;
    } else if (meta.mode === "power_tree") {
      // W2.3 InstancedMesh base^exp Lumina Tree
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.65, 2.4, 10),
        this.mats.bronze
      );
      trunk.position.y = 1.2;
      cg.add(trunk);

      const totalBuds = Math.min(125, Math.max(4, Math.round(safeNum(Math.pow(meta.base, meta.exp), 27))));
      const inst = new THREE.InstancedMesh(this.geos.petal, this.mats.runeEmerald, totalBuds);
      for (let i = 0; i < totalBuds; i++) {
        const layer = i % Math.max(1, meta.exp);
        const ang = (i / totalBuds) * Math.PI * 2 * (layer + 1);
        const r = 0.8 + (i / totalBuds) * 2.8;
        this._tmpObj.position.set(Math.cos(ang) * r, 2.4 + layer * 1.15, Math.sin(ang) * r);
        this._tmpObj.rotation.set(0, ang, 0);
        this._tmpObj.scale.setScalar(1.0);
        this._tmpObj.updateMatrix();
        inst.setMatrixAt(i, this._tmpObj.matrix);
      }
      inst.instanceMatrix.needsUpdate = true;
      cg.add(inst);
      state.treeInstancedMesh = inst;
    } else if (meta.mode === "dew_mirrors") {
      // W2.4 Parallel Dew-Mirrors & Starlight Transversal
      for (const my of [2.0, 4.6]) {
        const mirror = new THREE.Mesh(
          new THREE.BoxGeometry(7.2, 0.14, 0.9),
          this.mats.silverMoon
        );
        mirror.position.set(0, my, 0);
        cg.add(mirror);
      }
      const trans = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 5.6, 8),
        this.mats.sunGold
      );
      trans.position.set(0, 3.3, 0.25);
      trans.rotation.z = ((90 - meta.given) * Math.PI) / 180;
      cg.add(trans);

      const protractorPrism = new THREE.Mesh(
        new THREE.TorusGeometry(0.95, 0.08, 8, 24, Math.PI),
        this.mats.brass
      );
      protractorPrism.position.set(0, 2.0, 1.4);
      cg.add(protractorPrism);
      state.protractorPrism = protractorPrism;
    } else {
      // W3.4 k x k (k^2) Scale-Canopy InstancedMesh
      const refTile = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 0.16, 0.85),
        this.mats.runeEmerald
      );
      refTile.position.set(-4.2, 1.4, 0);
      cg.add(refTile);

      const k = Math.max(2, Math.min(8, meta.k));
      const count = k * k;
      const inst = new THREE.InstancedMesh(
        new THREE.BoxGeometry(0.78, 0.16, 0.78),
        this.mats.sunGold,
        count
      );
      for (let r = 0; r < k; r++) {
        for (let c = 0; c < k; c++) {
          const idx = r * k + c;
          this._tmpObj.position.set(
            1.2 + (c - (k - 1) / 2) * 0.88,
            1.4 + r * 0.88,
            0
          );
          this._tmpObj.rotation.set(0, 0, 0);
          this._tmpObj.scale.setScalar(1.0);
          this._tmpObj.updateMatrix();
          inst.setMatrixAt(idx, this._tmpObj.matrix);
        }
      }
      inst.instanceMatrix.needsUpdate = true;
      cg.add(inst);
      state.canopyInstancedMesh = inst;
    }

    slot.loomState = state;
  }

  // 4. W4 Living Grind-Vine Cliff Rails & W4.4 Crossed Spore-Streams
  _buildVineRail(slot) {
    const meta = normalizeVineMeta(slot.encounter, slot.initialSystemMeta);
    const cg = slot.contentGroup;

    const originStub = new THREE.Group();
    originStub.name = "OriginSproutStub";
    originStub.visible = true;

    const extrudedVine = new THREE.Group();
    extrudedVine.name = "ExtrudedChasmVine";
    // STRICT ANTI-SCRUB LAW: Full chasm curve is ALWAYS invisible pre-commit!
    extrudedVine.visible = false;

    const splatterMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.68, 12, 10),
      this.mats.sporeGel
    );
    splatterMesh.scale.set(1.15, 1.15, 0.35);
    splatterMesh.visible = false;
    cg.add(splatterMesh);

    slot.originStub = originStub;
    slot.tangentStub = originStub;
    slot.stubSpanRatio = SHRINE_STUB_SPAN_Z / SHRINE_CHASM_SPAN_Z;
    slot.extrudedVine = extrudedVine;
    slot.extrudedBridge = extrudedVine;
    slot.splatterMesh = splatterMesh;
    slot.sporeSplatterMesh = splatterMesh;

    cg.add(originStub);
    cg.add(extrudedVine);

    if (meta.isSystem) {
      // W4.4 Crossed Spore-Stream Emitters & Mega-Seed Pod
      for (const [sx, bVal, mat] of [
        [-4.2, meta.b1, this.mats.runeEmerald],
        [4.2, meta.b2, this.mats.sunGold],
      ]) {
        const pad = new THREE.Mesh(
          new THREE.CylinderGeometry(1.1, 1.3, 0.5, 12),
          this.mats.mossStone
        );
        pad.position.set(sx, yWorldFromMath(bVal) - 0.25, 0);
        cg.add(pad);

        const stubSeg = new THREE.Mesh(this.geos.vineSeg, mat);
        stubSeg.scale.set(1, SHRINE_STUB_SPAN_Z, 1);
        stubSeg.rotation.x = Math.PI / 2;
        stubSeg.position.set(sx, yWorldFromMath(bVal), -SHRINE_STUB_SPAN_Z * 0.5);
        originStub.add(stubSeg);
      }

      const nearFieldRune = new THREE.Mesh(this.geos.petal, this.mats.silverMoon);
      nearFieldRune.position.set(0, 1.4, -1.0);
      originStub.add(nearFieldRune);

      const stream1Segs = [];
      const stream2Segs = [];
      for (let i = 0; i < 16; i++) {
        const s1 = new THREE.Mesh(this.geos.vineSeg, this.mats.runeEmerald);
        const s2 = new THREE.Mesh(this.geos.vineSeg, this.mats.sunGold);
        extrudedVine.add(s1);
        extrudedVine.add(s2);
        stream1Segs.push(s1);
        stream2Segs.push(s2);
      }

      const megaSeedPod = new THREE.Group();
      megaSeedPod.name = "MegaSeedPod";
      const podCore = new THREE.Mesh(
        new THREE.DodecahedronGeometry(1.12, 1),
        this.mats.sunGold
      );
      megaSeedPod.add(podCore);
      const podHalo = new THREE.Mesh(
        new THREE.TorusGeometry(1.55, 0.12, 8, 24),
        this.mats.runeEmerald
      );
      megaSeedPod.add(podHalo);
      const absTx = Math.min(1e6, Math.abs(safeNum(meta.targetX, 3)));
      const zMeet = Math.min(
        SHRINE_CHASM_SPAN_Z - 1.5,
        Math.max(4.0, (absTx / Math.max(1, absTx + 2)) * SHRINE_TARGET_Z)
      );
      megaSeedPod.position.set(0, yWorldFromMath(meta.targetY), -zMeet);
      cg.add(megaSeedPod);

      slot.vineState = {
        isSystem: true,
        meta,
        nearFieldRune,
        megaSeedPod,
        zMeet,
        stream1Segs,
        stream2Segs,
        vineSegs: [],
      };
      this._shapeSystemStreams(slot, meta.targetX);
      extrudedVine.visible = false;
      return;
    }

    // Single-Rail Living Grind-Vine (W0.6, W4.1, W4.2, W4.3)
    const startB = meta.solveForB ? safeNum(slot.encounter?.startDial, 0) : meta.b;
    const rootPad = new THREE.Mesh(
      new THREE.CylinderGeometry(1.45, 1.7, 0.55, 14),
      this.mats.mossStone
    );
    rootPad.position.set(0, yWorldFromMath(meta.solveForB ? 0 : meta.b) - 0.3, 0);
    cg.add(rootPad);

    originStub.position.set(0, yWorldFromMath(startB), 0);
    for (let s = 0; s < 3; s++) {
      const segLen = SHRINE_STUB_SPAN_Z / 3;
      const seg = new THREE.Mesh(this.geos.vineSeg, this.mats.runeEmerald);
      seg.scale.set(1 - s * 0.12, segLen, 1 - s * 0.12);
      seg.rotation.x = Math.PI / 2;
      seg.position.set(0, 0, -(s + 0.5) * segLen);
      originStub.add(seg);
    }

    const targetRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.95, 0.22, 10, 28),
      this.mats.sunGold
    );
    targetRing.position.set(0, yWorldFromMath(meta.targetY), -SHRINE_TARGET_Z);
    cg.add(targetRing);

    const vineSegs = [];
    for (let i = 0; i < 20; i++) {
      const seg = new THREE.Mesh(this.geos.vineSeg, this.mats.runeEmerald);
      extrudedVine.add(seg);
      vineSegs.push(seg);
    }

    slot.vineState = {
      isSystem: false,
      meta,
      rootPad,
      targetRing,
      vineSegs,
    };
    this._shapeSingleVine(slot, meta.m, meta.b);
    extrudedVine.visible = false;
  }

  _positionSegmentBetween(mesh, x0, y0, z0, x1, y1, z1) {
    this._tmpVecA.set(x0, y0, z0);
    this._tmpVecB.set(x1, y1, z1);
    const len = Math.max(0.05, this._tmpVecA.distanceTo(this._tmpVecB));
    mesh.position.copy(this._tmpVecA).add(this._tmpVecB).multiplyScalar(0.5);
    mesh.scale.set(1, len, 1);
    const dir = this._tmpVecB.sub(this._tmpVecA).normalize();
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  }

  _shapeSingleVine(slot, mVal, bVal) {
    const vs = slot.vineState;
    if (!vs || vs.isSystem) return;
    const n = vs.vineSegs.length;
    const maxX = Math.min(1e4, Math.max(1, safeNum(vs.meta.targetX, 5))) * (SHRINE_CHASM_SPAN_Z / SHRINE_TARGET_Z);
    for (let i = 0; i < n; i++) {
      const u0 = i / n;
      const u1 = (i + 1) / n;
      const z0 = -u0 * SHRINE_CHASM_SPAN_Z;
      const z1 = -u1 * SHRINE_CHASM_SPAN_Z;
      const y0 = yWorldFromMath(mVal * (u0 * maxX) + bVal);
      const y1 = yWorldFromMath(mVal * (u1 * maxX) + bVal);
      this._positionSegmentBetween(vs.vineSegs[i], 0, y0, z0, 0, y1, z1);
    }
  }

  _shapeSystemStreams(slot, xEval) {
    const vs = slot.vineState;
    if (!vs || !vs.isSystem) return;
    const { m1, b1, m2, b2 } = vs.meta;
    const n = vs.stream1Segs.length;
    const zEnd = -vs.zMeet;
    for (let i = 0; i < n; i++) {
      const u0 = i / n;
      const u1 = (i + 1) / n;
      const xA0 = -4.2 * (1 - u0);
      const xA1 = -4.2 * (1 - u1);
      const xB0 = 4.2 * (1 - u0);
      const xB1 = 4.2 * (1 - u1);
      const z0 = u0 * zEnd;
      const z1 = u1 * zEnd;
      const yA0 = yWorldFromMath(m1 * (u0 * xEval) + b1);
      const yA1 = yWorldFromMath(m1 * (u1 * xEval) + b1);
      const yB0 = yWorldFromMath(m2 * (u0 * xEval) + b2);
      const yB1 = yWorldFromMath(m2 * (u1 * xEval) + b2);
      this._positionSegmentBetween(vs.stream1Segs[i], xA0, yA0, z0, xA1, yA1, z1);
      this._positionSegmentBetween(vs.stream2Segs[i], xB0, yB0, z0, xB1, yB1, z1);
    }
  }

  // 5. W5 Moonwell Starlight Rings & Sky-Astrolabes
  _buildMoonwellAstrolabe(slot) {
    const meta = normalizeMoonwellMeta(slot.encounter);
    const cg = slot.contentGroup;

    const astrolabeRings = new THREE.Group();
    astrolabeRings.position.set(0, 5.2, 0);
    const outerRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.85, 0.1, 8, 32),
      this.mats.brass
    );
    const midRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.42, 0.08, 8, 28),
      this.mats.sunGold
    );
    const innerRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.98, 0.07, 8, 24),
      this.mats.silverMoon
    );
    astrolabeRings.add(outerRing, midRing, innerRing);
    cg.add(astrolabeRings);

    const state = {
      mode: meta.mode,
      meta,
      astrolabeRings,
      outerRing,
      midRing,
      innerRing,
      moonwellBasin: null,
      moonLantern: null,
      diameterChord: null,
      rimSunMirror: null,
      rightAngleMarker: null,
      trussClosingBeam: null,
      pythagSquareA: null,
      pythagSquareB: null,
      pythagSquareC: null,
      rootCable: null,
      sunbeamRay: null,
    };

    if (meta.mode === "moonwell_thales") {
      // W5.2: Central Moon-Lantern at (0, 1.15, 0) + Diameter Chord + Rim Sun-Mirror (90° right angle!)
      const moonwellBasin = new THREE.Group();
      const stoneRim = new THREE.Mesh(
        new THREE.TorusGeometry(4.1, 0.32, 10, 36),
        this.mats.mossStone
      );
      stoneRim.rotation.x = Math.PI / 2;
      stoneRim.position.y = 0.45;
      moonwellBasin.add(stoneRim);

      const waterDisc = new THREE.Mesh(
        new THREE.CircleGeometry(4.05, 32),
        this.mats.crystalGlass
      );
      waterDisc.rotation.x = -Math.PI / 2;
      waterDisc.position.y = 0.42;
      moonwellBasin.add(waterDisc);
      cg.add(moonwellBasin);

      const moonLantern = new THREE.Group();
      moonLantern.name = "CentralMoonLantern";
      moonLantern.position.set(0, 1.15, 0);
      const moonSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.56, 14, 12),
        this.mats.silverMoon
      );
      const moonHalo = new THREE.Mesh(
        new THREE.TorusGeometry(0.84, 0.06, 8, 24),
        this.mats.sunGold
      );
      moonLantern.add(moonSphere, moonHalo);
      cg.add(moonLantern);

      const diameterChord = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 8.2, 8),
        this.mats.sunGold
      );
      diameterChord.rotation.z = Math.PI / 2;
      diameterChord.position.set(0, 1.15, 0);
      cg.add(diameterChord);

      const phi = (Math.max(15, Math.min(75, meta.alpha)) * Math.PI) / 180;
      const px = 4.1 * Math.cos(phi * 2 - Math.PI / 2);
      const pz = -Math.abs(4.1 * Math.sin(phi * 2 - Math.PI / 2)) - 0.6;
      const rimNorm = Math.hypot(px, pz) || 1;
      const rx = (px / rimNorm) * 4.1;
      const rz = -Math.abs((pz / rimNorm) * 4.1);

      const rimSunMirror = new THREE.Group();
      rimSunMirror.name = "RimSunMirror";
      rimSunMirror.position.set(rx, 1.15, rz);
      const mirrorDisc = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.55, 0.14, 16),
        this.mats.brass
      );
      mirrorDisc.rotation.x = Math.PI / 2;
      rimSunMirror.add(mirrorDisc);

      const rightAngleMarker = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.08, 0.42),
        this.mats.sunGold
      );
      rightAngleMarker.position.set(0, 0.08, 0.35);
      rimSunMirror.add(rightAngleMarker);
      cg.add(rimSunMirror);

      const chordA = new THREE.Mesh(this.geos.vineSeg, this.mats.runeEmerald);
      const chordB = new THREE.Mesh(this.geos.vineSeg, this.mats.runeEmerald);
      this._positionSegmentBetween(chordA, -4.1, 1.15, 0, rx, 1.15, rz);
      this._positionSegmentBetween(chordB, 4.1, 1.15, 0, rx, 1.15, rz);
      cg.add(chordA, chordB);

      state.moonwellBasin = moonwellBasin;
      state.moonLantern = moonLantern;
      state.diameterChord = diameterChord;
      state.rimSunMirror = rimSunMirror;
      state.rightAngleMarker = rightAngleMarker;
    } else if (meta.mode === "root_truss") {
      // W5.1 180° Crystal Truss
      const baseBeam = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.24, 0.36), this.mats.bronze);
      baseBeam.position.set(0, 0.8, 0);
      cg.add(baseBeam);

      const strutA = new THREE.Mesh(this.geos.vineSeg, this.mats.runeEmerald);
      this._positionSegmentBetween(strutA, -3.0, 0.8, 0, 0, 3.8, 0);
      const strutB = new THREE.Mesh(this.geos.vineSeg, this.mats.sunGold);
      this._positionSegmentBetween(strutB, 3.0, 0.8, 0, 0, 3.8, 0);
      cg.add(strutA, strutB);
      state.trussClosingBeam = strutB;
    } else if (meta.mode === "pythag_squares") {
      // W5.3 3D a^2 + b^2 = c^2 Squares & Root Cable
      const sScale = 0.42;
      const aLen = Math.max(1.2, Math.min(4.2, meta.legA * sScale));
      const bLen = Math.max(1.2, Math.min(4.2, meta.legB * sScale));
      const cLen = Math.hypot(aLen, bLen);

      const pythagSquareA = new THREE.Mesh(
        new THREE.BoxGeometry(aLen, 0.18, aLen),
        this.mats.runeEmerald
      );
      pythagSquareA.position.set(-aLen * 0.5, 0.65, aLen * 0.5);
      cg.add(pythagSquareA);

      const pythagSquareB = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, bLen, bLen),
        this.mats.frostCyan
      );
      pythagSquareB.position.set(0, 0.65 + bLen * 0.5, -bLen * 0.5);
      cg.add(pythagSquareB);

      const pythagSquareC = new THREE.Mesh(
        new THREE.BoxGeometry(cLen, cLen, 0.14),
        this.mats.sunGold
      );
      pythagSquareC.position.set(-aLen * 0.5, 0.65 + bLen * 0.5, -0.4);
      pythagSquareC.rotation.z = -Math.atan2(bLen, aLen);
      cg.add(pythagSquareC);

      const rootCable = new THREE.Mesh(this.geos.vineSeg, this.mats.brass);
      this._positionSegmentBetween(rootCable, -aLen, 0.65, 0, 0, 0.65 + bLen, 0);
      cg.add(rootCable);

      state.pythagSquareA = pythagSquareA;
      state.pythagSquareB = pythagSquareB;
      state.pythagSquareC = pythagSquareC;
      state.rootCable = rootCable;
    } else {
      // W5.4 Sunbeam Elevation Astrolabe
      const angRad = (meta.angleDeg * Math.PI) / 180;
      const spanVis = 4.6;
      const riseVis = Math.sin(angRad) * spanVis;
      const runVis = Math.cos(angRad) * spanVis;

      const baseBar = new THREE.Mesh(new THREE.BoxGeometry(runVis, 0.2, 0.35), this.mats.frostCyan);
      baseBar.position.set(0, 0.8, 0);
      cg.add(baseBar);

      const risePillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.26, Math.max(0.8, riseVis), 10),
        this.mats.runeEmerald
      );
      risePillar.position.set(runVis * 0.5, 0.8 + riseVis * 0.5, 0);
      cg.add(risePillar);

      const sunbeamRay = new THREE.Mesh(this.geos.vineSeg, this.mats.sunGold);
      this._positionSegmentBetween(
        sunbeamRay,
        -runVis * 0.5,
        0.8,
        0,
        runVis * 0.5,
        0.8 + riseVis,
        0
      );
      cg.add(sunbeamRay);
      state.sunbeamRay = sunbeamRay;
    }

    slot.moonwellState = state;
  }

  // 6. W6 3D Mosaic Slab Forges & Parabolic Spore-Arches
  _buildMosaicOrArch(slot) {
    const meta = normalizeMosaicOrArchMeta(slot.encounter);
    const cg = slot.contentGroup;

    if (meta.mode === "mosaic_forge") {
      // W6.3: x^2 Slab + Two Orthogonal (b/2)x Wings Framing Empty (b/2)^2 Corner Socket!
      const forgeTable = new THREE.Group();
      forgeTable.name = "MosaicSlabForgeTable";
      forgeTable.position.set(0, 1.45, 0);
      forgeTable.rotation.x = 0.34;
      cg.add(forgeTable);

      const plinth = new THREE.Mesh(
        new THREE.CylinderGeometry(3.1, 3.4, 0.36, 8),
        this.mats.mossStone
      );
      plinth.position.y = -0.18;
      forgeTable.add(plinth);

      const slabW = 2.2;
      const wingW = Math.max(0.55, Math.min(1.65, meta.half * 0.24));

      const xSquaredSlab = new THREE.Mesh(
        new THREE.BoxGeometry(slabW, 0.32, slabW),
        this.mats.runeEmerald
      );
      xSquaredSlab.name = "XSquaredCrystalSlab";
      xSquaredSlab.position.set(-0.55, 0.18, -0.55);
      forgeTable.add(xSquaredSlab);

      const wingEast = new THREE.Mesh(
        new THREE.BoxGeometry(wingW, 0.32, slabW),
        this.mats.frostCyan
      );
      wingEast.name = "HalfBXWingEast";
      wingEast.position.set(-0.55 + slabW * 0.5 + wingW * 0.5 + 0.05, 0.18, -0.55);
      forgeTable.add(wingEast);

      const wingHingePivot = new THREE.Group();
      wingHingePivot.position.set(-0.55, 0.18, -0.55 + slabW * 0.5 + 0.05);
      forgeTable.add(wingHingePivot);

      const wingNorth = new THREE.Mesh(
        new THREE.BoxGeometry(slabW, 0.32, wingW),
        this.mats.frostCyan
      );
      wingNorth.name = "HalfBXWingNorth";
      wingNorth.position.set(0, 0, wingW * 0.5);
      wingHingePivot.add(wingNorth);

      const socketX = -0.55 + slabW * 0.5 + wingW * 0.5 + 0.05;
      const socketZ = -0.55 + slabW * 0.5 + wingW * 0.5 + 0.05;

      const cornerSocket = new THREE.Mesh(
        new THREE.BoxGeometry(wingW * 1.04, 0.08, wingW * 1.04),
        this.mats.brass
      );
      cornerSocket.name = "MissingCornerSocket";
      cornerSocket.position.set(socketX, 0.05, socketZ);
      forgeTable.add(cornerSocket);

      const cornerCrystal = new THREE.Mesh(
        new THREE.BoxGeometry(wingW, 0.36, wingW),
        this.mats.sunGold
      );
      cornerCrystal.name = "GoldenCornerSquareCrystal";
      cornerCrystal.position.set(socketX, 0.2, socketZ);
      // Pre-commit strictly hidden until sealed!
      cornerCrystal.visible = false;
      forgeTable.add(cornerCrystal);

      const candidateCrystal = new THREE.Mesh(
        new THREE.BoxGeometry(wingW, 0.3, wingW),
        this.mats.silverMoon
      );
      candidateCrystal.position.set(socketX, 2.25, socketZ);
      forgeTable.add(candidateCrystal);

      slot.mosaicState = {
        mode: "mosaic_forge",
        meta,
        wingW,
        forgeTable,
        xSquaredSlab,
        wingEast,
        wingNorth,
        wingHingePivot,
        cornerSocket,
        cornerCrystal,
        candidateCrystal,
      };
      return;
    }

    // W6.1 / W6.2 Parabolic Spore-Arch (<=15% Origin Stub + Hidden Pre-Commit Extruded Arch)
    const originStub = new THREE.Group();
    originStub.name = "OriginSproutStub";
    // Anchor originStub at launch pad (0, BASE_PAD_Y, 0) so preview tilts stay <= 15% chasm span
    originStub.position.set(0, BASE_PAD_Y, 0);
    originStub.visible = true;
    const segLen = (SHRINE_STUB_SPAN_Z * 0.85) / 3;
    for (let s = 0; s < 3; s++) {
      const seg = new THREE.Mesh(this.geos.vineSeg, this.mats.sunGold);
      seg.scale.set(1, segLen, 1);
      seg.rotation.x = Math.PI / 2 - 0.35;
      seg.position.set(0, s * 0.22, -(s + 0.5) * segLen);
      originStub.add(seg);
    }

    const extrudedVine = new THREE.Group();
    extrudedVine.visible = false;
    const archSegs = [];
    for (let i = 0; i < 20; i++) {
      const seg = new THREE.Mesh(
        this.geos.vineSeg,
        i % 2 === 0 ? this.mats.sunGold : this.mats.runeEmerald
      );
      extrudedVine.add(seg);
      archSegs.push(seg);
    }

    const splatterMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.68, 12, 10),
      this.mats.sporeGel
    );
    splatterMesh.visible = false;

    const vertexRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.75, 0.18, 10, 28),
      this.mats.silverMoon
    );
    vertexRing.position.set(0, yWorldFromMath(meta.k), -SHRINE_CHASM_SPAN_Z * 0.5);

    cg.add(originStub, extrudedVine, splatterMesh, vertexRing);
    slot.originStub = originStub;
    slot.tangentStub = originStub;
    slot.stubSpanRatio = SHRINE_STUB_SPAN_Z / SHRINE_CHASM_SPAN_Z;
    slot.extrudedVine = extrudedVine;
    slot.extrudedBridge = extrudedVine;
    slot.splatterMesh = splatterMesh;
    slot.sporeSplatterMesh = splatterMesh;

    slot.mosaicState = {
      mode: meta.mode,
      meta,
      archSegs,
      vertexRing,
    };
    this._shapeParabolicArch(slot, meta.k);
    extrudedVine.visible = false;
  }

  _shapeParabolicArch(slot, peakK) {
    const ms = slot.mosaicState;
    if (!ms || !ms.archSegs) return;
    const n = ms.archSegs.length;
    const peakWorld = yWorldFromMath(peakK);
    for (let i = 0; i < n; i++) {
      const u0 = i / n;
      const u1 = (i + 1) / n;
      const z0 = -u0 * SHRINE_CHASM_SPAN_Z;
      const z1 = -u1 * SHRINE_CHASM_SPAN_Z;
      const y0 = 1.0 + 4 * u0 * (1 - u0) * Math.max(1.2, peakWorld - 1.0);
      const y1 = 1.0 + 4 * u1 * (1 - u1) * Math.max(1.2, peakWorld - 1.0);
      this._positionSegmentBetween(ms.archSegs[i], 0, y0, z0, 0, y1, z1);
    }
  }

  // 7. W7 Mitosis Puffballs, Log Stage-Spires, Bio-Waves & W7.4 90° Quarter-Turn i-Portals
  _buildMitosisOrPortal(slot) {
    const meta = normalizeW7Meta(slot.encounter);
    const cg = slot.contentGroup;

    if (meta.mode === "i_portal") {
      // W7.4: Upright Circular Argand Compass Sanctuary Arch + Emerald 90° Quarter-Turn i-Portal Rings
      const archCenterY = 4.6;
      const radius = 3.8;

      const compassRing = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.12, 10, 40),
        this.mats.mossStone
      );
      compassRing.position.set(0, archCenterY, 0);
      cg.add(compassRing);

      // 4 Argand Axis Receptors: +Real (0° Gold), +Imag (90° Emerald), -Real (180° Frost), -Imag (270° Violet)
      const axisSpecs = [
        { ang: 0, mat: this.mats.sunGold, name: "AxisPlusReal" },
        { ang: Math.PI / 2, mat: this.mats.runeEmerald, name: "AxisPlusImag" },
        { ang: Math.PI, mat: this.mats.frostCyan, name: "AxisMinusReal" },
        { ang: (3 * Math.PI) / 2, mat: this.mats.heliumViolet, name: "AxisMinusImag" },
      ];
      const receptors = [];
      for (const ax of axisSpecs) {
        const rec = new THREE.Mesh(new THREE.OctahedronGeometry(0.46, 0), ax.mat);
        rec.name = ax.name;
        rec.position.set(
          Math.cos(ax.ang) * radius,
          archCenterY + Math.sin(ax.ang) * radius,
          0
        );
        cg.add(rec);
        receptors.push(rec);
      }

      // Emerald 90° i-Portal Rings placed along each quarter-turn step from startAngleDeg
      const startRad = (safeNum(meta.startAngleDeg, 0) * Math.PI) / 180;
      const portalRings = [];
      const turns = Math.max(1, Math.min(8, meta.quarterTurns));
      for (let q = 1; q <= turns; q++) {
        const midAng = startRad + ((q - 0.5) * Math.PI) / 2;
        const pRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.72, 0.1, 8, 24),
          this.mats.runeEmerald
        );
        pRing.name = `EmeraldIPortalRing_${q}`;
        pRing.position.set(
          Math.cos(midAng) * (radius * 0.72),
          archCenterY + Math.sin(midAng) * (radius * 0.72),
          0
        );
        pRing.rotation.z = midAng;
        pRing.rotation.y = Math.PI / 2;
        cg.add(pRing);
        portalRings.push(pRing);
      }

      // Short startReal emitter stub (visible pre-commit)
      const emitterStub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.09, 0.9, 8),
        meta.startReal < 0 ? this.mats.frostCyan : this.mats.sunGold
      );
      emitterStub.rotation.z = startRad - Math.PI / 2;
      emitterStub.position.set(
        Math.cos(startRad) * 0.45,
        archCenterY + Math.sin(startRad) * 0.45,
        0
      );
      cg.add(emitterStub);

      // Near-field altar compass needle for updateDialPreview
      const previewNeedle = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, 0.12, 0.12),
        this.mats.brass
      );
      previewNeedle.position.set(0, 1.35, 3.1);
      cg.add(previewNeedle);

      // Full rotated Argand beam path (hidden pre-commit -> bends 90° per i-Portal on clear!)
      const fullBeamGroup = new THREE.Group();
      fullBeamGroup.name = "IPortalRotatedBeamPath";
      fullBeamGroup.visible = false;

      const beamMatsByQuadrant = [
        this.mats.sunGold,
        this.mats.runeEmerald,
        this.mats.frostCyan,
        this.mats.heliumViolet,
      ];

      let prevX = 0;
      let prevY = archCenterY;
      // Positive modulo keeps material index in 0..3 for negative startAngleDeg
      const startQuad = (((Math.round(safeNum(meta.startAngleDeg, 0) / 90) % 4) + 4) % 4);
      for (let q = 1; q <= turns; q++) {
        const ang = startRad + (q * Math.PI) / 2;
        const isLast = q === turns;
        const rStep = isLast ? radius : radius * 0.72;
        const nx = Math.cos(ang) * rStep;
        const ny = archCenterY + Math.sin(ang) * rStep;
        const matIdx = (((startQuad + q) % 4) + 4) % 4;
        const seg = new THREE.Mesh(this.geos.vineSeg, beamMatsByQuadrant[matIdx]);
        this._positionSegmentBetween(seg, prevX, prevY, 0, nx, ny, 0);
        fullBeamGroup.add(seg);
        prevX = nx;
        prevY = ny;
      }
      cg.add(fullBeamGroup);

      slot.w7State = {
        mode: "i_portal",
        meta,
        receptors,
        portalRings,
        emitterStub,
        previewNeedle,
        fullBeamGroup,
      };
      return;
    }

    if (meta.mode === "mitosis_puffballs") {
      // W7.1 Dividing a * b^x Mitosis Puffballs via InstancedMesh
      const count = Math.min(128, Math.max(4, Math.round(safeNum(meta.target, 16))));
      const inst = new THREE.InstancedMesh(this.geos.heliumPuff, this.mats.runeEmerald, count);
      for (let i = 0; i < count; i++) {
        const ring = Math.floor(Math.log2(i + 1));
        const ang = (i * 2.39996) % (Math.PI * 2);
        const r = 0.65 + ring * 0.72;
        this._tmpObj.position.set(Math.cos(ang) * r, 1.2 + ring * 0.48, Math.sin(ang) * r);
        this._tmpObj.rotation.set(0, ang, 0);
        this._tmpObj.scale.setScalar(0.78);
        this._tmpObj.updateMatrix();
        inst.setMatrixAt(i, this._tmpObj.matrix);
      }
      inst.instanceMatrix.needsUpdate = true;
      cg.add(inst);
      slot.w7State = { mode: "mitosis_puffballs", meta, puffballInstancedMesh: inst };
      return;
    }

    if (meta.mode === "log_spire") {
      // W7.2 Inverse log_b Stage-Counter Spire
      const spire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.75, 7.2, 12),
        this.mats.mossStone
      );
      spire.position.y = 3.6;
      cg.add(spire);

      const stageRings = [];
      for (let s = 0; s < 6; s++) {
        const rMat = this.mats.runeEmerald.clone();
        rMat.emissiveIntensity = 0.14;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.1, 8, 24), rMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 1.2 + s * 0.95;
        cg.add(ring);
        stageRings.push({ ring, mat: rMat });
      }
      const collar = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.12, 8, 24), this.mats.brass);
      collar.rotation.x = Math.PI / 2;
      collar.position.y = 0.65;
      cg.add(collar);

      slot.w7State = { mode: "log_spire", meta, stageRings, collar };
      return;
    }

    // W7.3 Harmonic Canopy Bio-Wave (15% stub + hidden pre-commit sinusoidal wave)
    const midY = yWorldFromMath(meta.midline);
    const midlineRod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, SHRINE_CHASM_SPAN_Z, 8),
      this.mats.silverMoon
    );
    midlineRod.rotation.x = Math.PI / 2;
    midlineRod.position.set(0, midY, -SHRINE_CHASM_SPAN_Z * 0.5);
    cg.add(midlineRod);

    const originStub = new THREE.Group();
    originStub.name = "OriginSproutStub";
    originStub.position.set(0, midY, 0);
    originStub.visible = true;
    const waveStubLen = (SHRINE_STUB_SPAN_Z * 0.85) / 3;
    for (let s = 0; s < 3; s++) {
      const seg = new THREE.Mesh(this.geos.vineSeg, this.mats.runeEmerald);
      seg.scale.set(1, waveStubLen, 1);
      seg.rotation.x = Math.PI / 2 - 0.25;
      seg.position.set(0, s * 0.18, -(s + 0.5) * waveStubLen);
      originStub.add(seg);
    }

    const extrudedVine = new THREE.Group();
    extrudedVine.visible = false;
    const waveSegs = [];
    for (let i = 0; i < 24; i++) {
      const seg = new THREE.Mesh(this.geos.vineSeg, this.mats.runeEmerald);
      extrudedVine.add(seg);
      waveSegs.push(seg);
    }

    const splatterMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.65, 12, 10),
      this.mats.sporeGel
    );
    splatterMesh.visible = false;

    cg.add(originStub, extrudedVine, splatterMesh);
    slot.originStub = originStub;
    slot.tangentStub = originStub;
    slot.stubSpanRatio = SHRINE_STUB_SPAN_Z / SHRINE_CHASM_SPAN_Z;
    slot.extrudedVine = extrudedVine;
    slot.extrudedBridge = extrudedVine;
    slot.splatterMesh = splatterMesh;
    slot.sporeSplatterMesh = splatterMesh;

    slot.w7State = {
      mode: "harmonic_wave",
      meta,
      midlineRod,
      waveSegs,
    };
    this._shapeHarmonicWave(slot, meta.amplitude);
    extrudedVine.visible = false;
  }

  _shapeHarmonicWave(slot, ampVal) {
    const ws = slot.w7State;
    if (!ws || !ws.waveSegs) return;
    const n = ws.waveSegs.length;
    const midY = yWorldFromMath(ws.meta.midline);
    const ampWorld = Math.max(0.25, Math.abs(ampVal) * VINE_Y_SCALE);
    for (let i = 0; i < n; i++) {
      const u0 = i / n;
      const u1 = (i + 1) / n;
      const z0 = -u0 * SHRINE_CHASM_SPAN_Z;
      const z1 = -u1 * SHRINE_CHASM_SPAN_Z;
      const y0 = midY + Math.sin(u0 * Math.PI * 4) * ampWorld;
      const y1 = midY + Math.sin(u1 * Math.PI * 4) * ampWorld;
      this._positionSegmentBetween(ws.waveSegs[i], 0, y0, z0, 0, y1, z1);
    }
  }

  refreshActiveEncounterVisual(slot, updatedEncounter, dialValue = 0) {
    if (!slot || !updatedEncounter) return;
    slot.encounter = updatedEncounter;
    this._buildShrineArchetypeIntoSlot(slot);
    this.updateDialPreview(slot, dialValue);
  }

  updateDialPreview(slot, numericValue) {
    if (!slot) return;
    const safeVal = safeNum(numericValue, 0);

    // CRITICAL ANTI-SCRUB RESET: Any curve/vine shrine MUST hide full extruded curve on dial preview!
    if (slot.extrudedVine) {
      slot.extrudedVine.visible = false;
    }

    if (slot.cauldronState) {
      const s = 0.65 + Math.min(1.4, Math.abs(safeVal) / 80);
      slot.cauldronState.previewVial.scale.set(1, s, 1);
      slot.cauldronState.previewVial.material.color.setHex(safeVal < 0 ? 0x4ad8ff : 0x3bf0c5);
    } else if (slot.balanceState) {
      // Strictly local preview crystal ONLY; beamPivot stays torque-locked pre-commit!
      const s = 0.8 + Math.min(1.1, Math.abs(safeVal) * 0.06);
      slot.balanceState.previewCrystal.scale.setScalar(s);
    } else if (slot.loomState) {
      const s = 0.8 + Math.min(1.2, Math.abs(safeVal) * 0.05);
      slot.loomState.previewGem.scale.setScalar(s);
      if (slot.loomState.protractorPrism) {
        slot.loomState.protractorPrism.rotation.z = (safeVal * Math.PI) / 180;
      }
    } else if (slot.vineState && slot.originStub) {
      const vs = slot.vineState;
      if (vs.isSystem && vs.nearFieldRune) {
        const clampedZ = -Math.max(0.2, Math.min(SHRINE_STUB_SPAN_Z, Math.abs(safeVal) * 0.25));
        vs.nearFieldRune.position.z = clampedZ;
      } else if (vs.meta.solveForB) {
        slot.originStub.position.y = yWorldFromMath(safeVal);
        slot.originStub.rotation.x = Math.atan2(
          vs.meta.m * vs.meta.targetX * VINE_Y_SCALE,
          SHRINE_TARGET_Z
        );
      } else {
        slot.originStub.position.y = yWorldFromMath(vs.meta.b);
        slot.originStub.rotation.x = Math.atan2(
          safeVal * vs.meta.targetX * VINE_Y_SCALE,
          SHRINE_TARGET_Z
        );
      }
    } else if (slot.moonwellState) {
      const rad = (safeVal * Math.PI) / 180;
      slot.moonwellState.midRing.rotation.z = rad;
      slot.moonwellState.innerRing.rotation.y = rad * 0.8;
    } else if (slot.mosaicState) {
      if (slot.mosaicState.mode === "mosaic_forge" && slot.mosaicState.candidateCrystal) {
        const target = Math.max(1, slot.mosaicState.meta.answer);
        const ratio = Math.sqrt(Math.max(0.25, Math.min(3.0, Math.abs(safeVal) / target)));
        slot.mosaicState.candidateCrystal.scale.set(ratio, 1, ratio);
      } else if (slot.originStub) {
        slot.originStub.rotation.x = -Math.min(0.55, Math.max(-0.35, safeVal * 0.03));
      }
    } else if (slot.w7State) {
      if (slot.w7State.mode === "i_portal" && slot.w7State.previewNeedle) {
        slot.w7State.previewNeedle.rotation.z = safeVal < 0 ? Math.PI : 0;
      } else if (slot.w7State.mode === "log_spire" && slot.w7State.collar) {
        slot.w7State.collar.rotation.z = safeVal * 0.45;
      }
    }
  }

  playTwinBeamVisual(slot, playerOriginVec3 = null, isRepel = false) {
    if (!slot) return;
    slot.group.updateMatrixWorld(true);
    const origin = playerOriginVec3 || new THREE.Vector3(slot.x, slot.y + 1.5, slot.z + 6.0);

    if (isRepel) {
      this._tmpVecA.set(4.2, 2.6, 0).applyMatrix4(slot.group.matrixWorld);
      this._spawnAmberSparks(this._tmpVecA, 20);
      if (slot.balanceState) {
        slot.balanceState.repelAnim = { active: true, t: 0, dur: 0.55 };
        slot.balanceState.repelSparkRing.visible = true;
        slot.balanceState.repelConstantCluster.position.x = -0.82;
        slot.balanceState.repelVariableCluster.position.x = 0.82;
      }
      return;
    }

    const targetsLocal = slot.balanceState
      ? [new THREE.Vector3(-4.2, 2.4, 0), new THREE.Vector3(4.2, 2.4, 0)]
      : [new THREE.Vector3(-1.5, 2.0, 0), new THREE.Vector3(1.5, 2.0, 0)];

    for (let i = 0; i < 2; i++) {
      const beam = this.twinBeams[i];
      const worldTarget = targetsLocal[i].clone().applyMatrix4(slot.group.matrixWorld);
      beam.active = true;
      beam.elapsed = 0;
      beam.dur = 0.42;
      beam.mat.color.setHex(0x3bf0c5);
      beam.mat.opacity = 0.9;
      this._positionSegmentBetween(
        beam.mesh,
        origin.x,
        origin.y,
        origin.z,
        worldTarget.x,
        worldTarget.y,
        worldTarget.z
      );
      beam.mesh.visible = true;
      this._spawnSteamPoofs(worldTarget, 6);
    }
  }

  playCommitVisual(slot, commitResult = {}, enc = null) {
    if (!slot) return null;
    if (commitResult?.invalidInput) {
      return {
        cleared: false,
        invalidInput: true,
        outcome: commitResult.outcome || "nudge",
      };
    }
    const encounter = enc || slot.encounter || {};
    slot.encounter = encounter;
    const outcome = commitResult?.outcome || "clear";
    const isClear = outcome === "clear" || outcome === "warm_reveal";
    const safeDelta = safeNum(commitResult?.delta, isClear ? 0 : 2);
    const ans = safeNum(encounter.answer, 0);
    const committedVal = ans + (safeDelta === 0 && !isClear ? 2 : safeDelta);

    slot.group.updateMatrixWorld(true);
    const centerWorld = new THREE.Vector3(0, 2.2, 0).applyMatrix4(slot.group.matrixWorld);
    const staffOrigin = new THREE.Vector3(0, 1.8, 5.5).applyMatrix4(slot.group.matrixWorld);

    this._spawnArcOrb(
      staffOrigin,
      centerWorld,
      ans < 0 ? this.mats.frostCyan : this.mats.sunGold,
      2.6,
      0.42
    );

    if (!isClear) {
      // Deterministic 1st-miss Nudge: execute exact dialed math + show Δy Caliper!
      this.audio?.playCaliperNudge?.();
      this._applyNudgeConsequence(slot, ans, committedVal);
      return {
        cleared: false,
        outcome,
      };
    }

    // Clear / Warm Reveal!
    slot.cleared = true;
    slot.caliperMesh.visible = false;
    if (slot.splatterMesh) slot.splatterMesh.visible = false;
    slot.beaconMat.color.setHex(0xffd166);
    slot.beaconMat.opacity = 0.45;

    const conseq = {
      cleared: true,
      outcome,
      overdrive: Boolean(commitResult?.overdrive),
      pushbackWave: {
        x: slot.x,
        y: slot.y,
        z: slot.z,
        overdrive: Boolean(commitResult?.overdrive),
      },
      playerAnim: null,
      mysteryId: null,
      subZeroClear: false,
      answerVal: ans,
      mosaicForged: false,
    };

    if (slot.cauldronState) {
      const cs = slot.cauldronState;
      if (cs.mode === "vacuum_scoop" && cs.submergedSpores.visible) {
        cs.submergedSpores.visible = false;
        this._spawnArcOrb(centerWorld, staffOrigin, this.mats.frostCyan, 3.2, 0.48);
      }
      if (cs.mode === "polarity_mirror") {
        cs.polarityMirror.rotation.z = Math.PI;
      }
      this._setCauldronTemperature(cs, ans);
      this._spawnSteamPoofs(centerWorld, 18);
      this.audio?.playZeroPairPoof?.();

      if (ans < 0) {
        conseq.subZeroClear = true;
        if (ans <= -100) {
          conseq.mysteryId = "subzero_abyss";
        }
        cs.skyChest.visible = true;
        cs.hatchedToad.visible = true;
        cs.hatchedToad.rotation.set(0, 0, Math.PI);
        cs.hatchedToad.position.set(0, 2.4, 0);
        cs.toadAscending = true;
        cs.toadVy = 5.4;
      }
    } else if (slot.balanceState) {
      slot.balanceState.targetTheta = 0;
      slot.balanceState.theta = 0;
      slot.balanceState.omega = 0;
      slot.balanceState.beamPivot.rotation.z = 0;
      slot.balanceState.bridgePlanks.visible = true;
    } else if (slot.loomState) {
      if (slot.loomState.loomPodGroup && slot.loomState.loomOrbGroup) {
        slot.loomState.loomPodGroup.position.x = -2.3;
        slot.loomState.loomOrbGroup.position.x = 1.55;
        slot.loomState.unpacked = true;
      }
    } else if (slot.vineState && slot.extrudedVine) {
      const vs = slot.vineState;
      if (vs.isSystem) {
        this._shapeSystemStreams(slot, vs.meta.targetX);
        vs.megaSeedPod.scale.setScalar(1.35);
      } else {
        this._shapeSingleVine(slot, vs.meta.m, vs.meta.b);
      }
      slot.extrudedVine.visible = true;
      conseq.mysteryId = "rainbow_surfer";
      conseq.playerAnim = { kind: "grind_vine", t: 0, dur: 1.05, slot };
    } else if (slot.moonwellState) {
      slot.moonwellState.midRing.rotation.z = 0;
      slot.moonwellState.innerRing.rotation.y = 0;
      this.audio?.playAstrolabeLock?.();
      conseq.mysteryId = "astrolabe_lock";
    } else if (slot.mosaicState) {
      if (slot.mosaicState.mode === "mosaic_forge") {
        slot.mosaicState.cornerCrystal.visible = true;
        slot.mosaicState.candidateCrystal.visible = false;
        conseq.mosaicForged = true;
        this._spawnAmberSparks(centerWorld, 16);
      } else if (slot.extrudedVine) {
        this._shapeParabolicArch(slot, slot.mosaicState.meta.k);
        slot.extrudedVine.visible = true;
        conseq.mysteryId = "rainbow_surfer";
        conseq.playerAnim = { kind: "grind_vine", t: 0, dur: 1.05, slot };
      }
    } else if (slot.w7State) {
      if (slot.w7State.mode === "i_portal") {
        slot.w7State.fullBeamGroup.visible = true;
        this.audio?.playAstrolabeLock?.();
        conseq.mysteryId = "astrolabe_lock";
      } else if (slot.w7State.mode === "log_spire") {
        const st = slot.w7State.meta.stage;
        slot.w7State.stageRings.forEach((r, idx) => {
          r.mat.emissiveIntensity = idx < st ? 0.92 : 0.14;
        });
      } else if (slot.w7State.mode === "harmonic_wave" && slot.extrudedVine) {
        this._shapeHarmonicWave(slot, slot.w7State.meta.amplitude);
        slot.extrudedVine.visible = true;
        conseq.mysteryId = "rainbow_surfer";
        conseq.playerAnim = { kind: "grind_vine", t: 0, dur: 1.05, slot };
      }
    }

    return conseq;
  }

  _applyNudgeConsequence(slot, ans, committedVal) {
    if (slot.cauldronState) {
      const yTrue = elixirLevelToY(ans);
      const yDial = elixirLevelToY(committedVal);
      this._setCauldronTemperature(slot.cauldronState, committedVal);
      this._positionCaliperVertical(slot.caliperMesh, 0, yTrue, yDial, -1.6);
      return;
    }

    if (slot.balanceState) {
      const bm = slot.balanceState.meta;
      const diffCoeff = bm.leftA - bm.rightA;
      const imbalance =
        diffCoeff !== 0
          ? bm.leftA * committedVal + bm.leftB - (bm.rightA * committedVal + bm.rightB)
          : committedVal - ans;
      const targetTheta = Math.max(-0.42, Math.min(0.42, -imbalance * 0.06));
      slot.balanceState.targetTheta = targetTheta || -0.18;
      slot.balanceState.theta = slot.balanceState.targetTheta * 0.75;
      slot.balanceState.beamPivot.rotation.z = slot.balanceState.theta;
      const panDiff = Math.max(0.55, Math.abs(8.4 * Math.sin(slot.balanceState.theta)));
      this._positionCaliperVertical(slot.caliperMesh, 0, 2.2, 2.2 + panDiff, 1.2);
      return;
    }

    if (slot.vineState && slot.extrudedVine) {
      const vs = slot.vineState;
      if (vs.isSystem) {
        this._shapeSystemStreams(slot, committedVal);
        slot.extrudedVine.visible = true;
        const y1 = yWorldFromMath(vs.meta.m1 * committedVal + vs.meta.b1);
        const y2 = yWorldFromMath(vs.meta.m2 * committedVal + vs.meta.b2);
        if (slot.splatterMesh) {
          slot.splatterMesh.position.set(0, (y1 + y2) * 0.5, -vs.zMeet);
          slot.splatterMesh.visible = true;
        }
        this._positionCaliperVertical(slot.caliperMesh, 0, y1, y2, -vs.zMeet);
      } else {
        const mUsed = vs.meta.solveForB ? vs.meta.m : committedVal;
        const bUsed = vs.meta.solveForB ? committedVal : vs.meta.b;
        const yDial = yWorldFromMath(mUsed * vs.meta.targetX + bUsed);
        const yTrue = yWorldFromMath(vs.meta.targetY);
        this._shapeSingleVine(slot, mUsed, bUsed);
        slot.extrudedVine.visible = true;
        if (slot.splatterMesh) {
          slot.splatterMesh.position.set(0, yDial, -SHRINE_TARGET_Z);
          slot.splatterMesh.visible = true;
        }
        this._positionCaliperVertical(slot.caliperMesh, 0, yTrue, yDial, -SHRINE_TARGET_Z);
      }
      return;
    }

    if (slot.mosaicState && slot.mosaicState.mode !== "mosaic_forge" && slot.extrudedVine) {
      const yTrue = yWorldFromMath(ans);
      const yDial = yWorldFromMath(committedVal);
      this._shapeParabolicArch(slot, committedVal);
      slot.extrudedVine.visible = true;
      if (slot.splatterMesh) {
        slot.splatterMesh.position.set(0, yDial, -SHRINE_CHASM_SPAN_Z * 0.5);
        slot.splatterMesh.visible = true;
      }
      this._positionCaliperVertical(slot.caliperMesh, 0, yTrue, yDial, -SHRINE_CHASM_SPAN_Z * 0.5);
      return;
    }

    if (slot.w7State && slot.w7State.mode === "harmonic_wave" && slot.extrudedVine) {
      const ampDial = Math.max(0.3, Math.abs(committedVal - slot.w7State.meta.midline));
      this._shapeHarmonicWave(slot, ampDial);
      slot.extrudedVine.visible = true;
      const yTrue = yWorldFromMath(ans);
      const yDial = yWorldFromMath(committedVal);
      if (slot.splatterMesh) {
        slot.splatterMesh.position.set(0, yDial, -SHRINE_CHASM_SPAN_Z * 0.25);
        slot.splatterMesh.visible = true;
      }
      this._positionCaliperVertical(slot.caliperMesh, 0, yTrue, yDial, -SHRINE_CHASM_SPAN_Z * 0.25);
      return;
    }

    // Universal fallback caliper bar for Looms, Astrolabes, Mosaic Forge & i-Portals
    const offset = Math.max(0.6, Math.min(2.8, Math.abs(committedVal - ans) * 0.22));
    this._positionCaliperVertical(slot.caliperMesh, 0, 1.8, 1.8 + offset, 1.8);
  }

  update(rawDt, rawElapsed = 0) {
    const dt = Math.min(0.05, Math.max(0, safeNum(rawDt, 0)));
    const elapsed = safeNum(rawElapsed, 0);
    for (const p of this.steamPoofPool) {
      if (!p.active) continue;
      p.elapsed += dt;
      const u = Math.min(1, p.elapsed / p.dur);
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.scale.setScalar(0.55 + u * 1.15);
      p.mat.opacity = Math.max(0, 0.9 * (1 - u));
      if (u >= 1) {
        p.active = false;
        p.mesh.visible = false;
      }
    }

    for (const s of this.amberSparkPool) {
      if (!s.active) continue;
      s.elapsed += dt;
      const u = Math.min(1, s.elapsed / s.dur);
      s.mesh.position.x += s.vx * dt;
      s.mesh.position.y += (s.vy - 5.5 * u) * dt;
      s.mesh.position.z += s.vz * dt;
      s.mat.opacity = Math.max(0, 0.95 * (1 - u));
      if (u >= 1) {
        s.active = false;
        s.mesh.visible = false;
      }
    }

    for (const arc of this.siphonArcPool) {
      if (!arc.active) continue;
      arc.elapsed += dt;
      const u = Math.min(1, arc.elapsed / arc.dur);
      const om = 1 - u;
      arc.mesh.position.set(
        om * om * arc.p0.x + 2 * om * u * arc.p1.x + u * u * arc.p2.x,
        om * om * arc.p0.y + 2 * om * u * arc.p1.y + u * u * arc.p2.y,
        om * om * arc.p0.z + 2 * om * u * arc.p1.z + u * u * arc.p2.z
      );
      if (u >= 1) {
        arc.active = false;
        arc.mesh.visible = false;
      }
    }

    for (const beam of this.twinBeams) {
      if (!beam.active) continue;
      beam.elapsed += dt;
      const u = Math.min(1, beam.elapsed / beam.dur);
      beam.mat.opacity = Math.max(0, 0.9 * (1 - u));
      if (u >= 1) {
        beam.active = false;
        beam.mesh.visible = false;
      }
    }

    for (const slot of this.slots) {
      slot.approachRing.rotation.z = elapsed * 0.8;

      if (slot.cauldronState && slot.cauldronState.toadAscending) {
        const cs = slot.cauldronState;
        cs.hatchedToad.rotation.z = Math.PI;
        cs.hatchedToad.position.y += cs.toadVy * dt;
        if (cs.hatchedToad.position.y >= 7.35) {
          cs.toadAscending = false;
          cs.chestBonked = true;
          cs.chestLid.rotation.x = -1.1;
          cs.hatchedToad.position.y = 6.95;
        }
      }

      if (slot.balanceState) {
        const bs = slot.balanceState;
        const accel = -42 * (bs.theta - bs.targetTheta) - 7.2 * bs.omega;
        bs.omega += accel * dt;
        bs.theta += bs.omega * dt;
        bs.beamPivot.rotation.z = bs.theta;
        bs.leftPan.rotation.z = -bs.theta;
        bs.rightPan.rotation.z = -bs.theta;

        if (bs.repelAnim && bs.repelAnim.active) {
          bs.repelAnim.t += dt;
          const t = bs.repelAnim.t;
          if (t < 0.14) {
            const p = t / 0.14;
            bs.repelConstantCluster.position.x = -0.35 * (1 - p);
            bs.repelVariableCluster.position.x = 0.35 * (1 - p);
          } else if (t < bs.repelAnim.dur) {
            const u = (t - 0.14) / (bs.repelAnim.dur - 0.14);
            const recoil = 1.1 * Math.exp(-4.5 * u) * Math.cos(14 * u);
            bs.repelConstantCluster.position.x = -Math.abs(recoil);
            bs.repelVariableCluster.position.x = Math.abs(recoil);
          } else {
            bs.repelAnim.active = false;
            bs.repelSparkRing.visible = false;
            bs.repelConstantCluster.position.x = 0;
            bs.repelVariableCluster.position.x = 0;
          }
        }
      }

      if (slot.w7State && slot.w7State.mode === "i_portal") {
        for (let i = 0; i < slot.w7State.portalRings.length; i++) {
          slot.w7State.portalRings[i].rotation.x += dt * 1.4;
        }
      }
    }
  }

  dispose() {
    for (const slot of this.slots) {
      if (slot.group && this.scene) {
        this.scene.remove(slot.group);
      }
    }
    this.slots = [];
    if (this.poolGroup && this.scene) {
      this.scene.remove(this.poolGroup);
    }
  }
}
