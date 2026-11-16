/**
 * Bloom N — Custom 3D Character, Creature, Pilot & Guardian Graphics Engine
 * Replaces raw geometric primitives across Frostwake, Oddroot Wilds, and Arc Bastion
 * with organic LatheGeometry / beveled ExtrudeGeometry / spline TubeGeometry sculptures,
 * cached procedural painted CanvasTexture/DataTexture faces & fabrics, articulated
 * 60fps secondary animations, and local transparent character portrait assets.
 *
 * 100% Headless-Node safe (falls back to deterministic RGBA DataTextures when DOM Canvas
 * is absent) and 100% offline/vendored (zero external URLs).
 */

import * as THREE from "../vendor/three.module.min.js";

export const CHARACTER_PORTRAIT_PATHS = Object.freeze({
  terra_dozer: "./assets/characters/terra-dozer.png",
  aurora_sled: "./assets/characters/aurora-sled.png",
  starlight_glider: "./assets/characters/starlight-glider.png",
  bramble_boar: "./assets/characters/bramble-boar.png",
  iron_ballista: "./assets/characters/iron-ballista.png",
  prism_rail_skiff: "./assets/characters/prism-rail-skiff.png",
  crystal_fox: "./assets/characters/crystal-fox.png",
  or_crystal_fox: "./assets/characters/crystal-fox.png",
  zero_g_toad: "./assets/characters/zero-g-toad.png",
  luminous_oddling: "./assets/characters/luminous-oddling.png",
  sun_oddling: "./assets/characters/luminous-oddling.png",
  eclipse_stag: "./assets/characters/eclipse-stag.png",
  starlight_whale: "./assets/characters/starlight-whale.png",
  guardian_frostwake: "./assets/characters/guardian-frostwake.png",
  guardian_oddroot: "./assets/characters/guardian-oddroot.png",
  guardian_bastion: "./assets/characters/guardian-bastion.png",
  rime_captain: "./assets/characters/enemy-rime-captain.png",
  gloom_wisp: "./assets/characters/enemy-gloom-wisp.png",
  clockwork_strider: "./assets/characters/enemy-clockwork-strider.png",
  gear_hound: "./assets/characters/enemy-gear-hound.png",
});

const _textureCache = new Map();
const _spriteTexCache = new Map();

function hasBrowserCanvas() {
  return (
    typeof document !== "undefined" &&
    typeof document.createElement === "function"
  );
}

function makeFallbackDataTexture(width, height, pixelFn, srgb = true) {
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const v = y / Math.max(1, height - 1);
    for (let x = 0; x < width; x++) {
      const u = x / Math.max(1, width - 1);
      const idx = (y * width + x) * 4;
      const [r, g, b, a] = pixelFn(u, v, x, y);
      data[idx] = Math.max(0, Math.min(255, r | 0));
      data[idx + 1] = Math.max(0, Math.min(255, g | 0));
      data[idx + 2] = Math.max(0, Math.min(255, b | 0));
      data[idx + 3] = Math.max(0, Math.min(255, (a ?? 255) | 0));
    }
  }
  const tex = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  if (srgb && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

function makeCanvasOrFallbackTexture(cacheKey, size, draw2dFn, fallbackPixelFn) {
  if (_textureCache.has(cacheKey)) return _textureCache.get(cacheKey);

  let tex = null;
  if (hasBrowserCanvas()) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext && canvas.getContext("2d");
    if (ctx) {
      draw2dFn(ctx, size);
      tex = new THREE.CanvasTexture(canvas);
      if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.needsUpdate = true;
    }
  }
  if (!tex) {
    tex = makeFallbackDataTexture(64, 64, fallbackPixelFn, true);
  }
  _textureCache.set(cacheKey, tex);
  return tex;
}

/**
 * Crisp 4-step cel-shading ramp for vibrant stylized 3D character lighting.
 */
export function getCharacterToonGradient() {
  const key = "__char_toon_grad_v1";
  if (_textureCache.has(key)) return _textureCache.get(key);
  const steps = new Uint8Array([
    118, 118, 118, 255,
    168, 168, 168, 255,
    218, 218, 218, 255,
    255, 255, 255, 255,
  ]);
  const tex = new THREE.DataTexture(steps, 4, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  _textureCache.set(key, tex);
  return tex;
}

/**
 * Loads a local character portrait PNG from `./assets/characters/` in browser WebGL,
 * or returns a clean RGBA DataTexture in headless Node tests.
 */
export function loadCharacterSpriteTexture(assetKeyOrPath) {
  const relPath =
    CHARACTER_PORTRAIT_PATHS[assetKeyOrPath] || String(assetKeyOrPath || "");
  if (!relPath) return getCreatureSkinTexture("fox");
  if (_spriteTexCache.has(relPath)) return _spriteTexCache.get(relPath);

  if (
    typeof window !== "undefined" &&
    typeof Image !== "undefined" &&
    hasBrowserCanvas()
  ) {
    const loader = new THREE.TextureLoader();
    const tex = loader.load(
      relPath,
      (loaded) => {
        if (THREE.SRGBColorSpace) loaded.colorSpace = THREE.SRGBColorSpace;
        loaded.needsUpdate = true;
      },
      undefined,
      () => {}
    );
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    _spriteTexCache.set(relPath, tex);
    return tex;
  }

  const fallback = makeFallbackDataTexture(32, 32, (u, v) => {
    const d = Math.hypot(u - 0.5, v - 0.5);
    return d < 0.45 ? [90, 225, 235, 240] : [0, 0, 0, 0];
  });
  _spriteTexCache.set(relPath, fallback);
  return fallback;
}

export function buildCharacterEmblemSprite(
  assetKey,
  { scale = 1.4, yOffset = 2.4, opacity = 0.95, name = "character_emblem_sprite" } = {}
) {
  const map = loadCharacterSpriteTexture(assetKey);
  const mat = new THREE.SpriteMaterial({
    map,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const spr = new THREE.Sprite(mat);
  spr.name = name;
  spr.scale.set(scale, scale, 1);
  spr.position.set(0, yOffset, 0);
  return spr;
}

/**
 * Expressive painted character face textures (eyes, irises, specular catchlights,
 * brows, rosy cheeks, smiles, or glowing visors/goggles).
 * Mapped onto sphere/head UVs where front center is u = 0.5, v = 0.5 (rotated -PI/2 on Y).
 */
export function getCharacterFaceTexture(style = "alchemist") {
  const key = `face_${style}`;
  const palettes = {
    alchemist: { skin: "#ffd8be", cheek: "#ff9b8a", iris: "#22b886", brow: "#5a3825" },
    arctic_engineer: { skin: "#ffe0c8", cheek: "#ffa396", iris: "#2cb8e8", brow: "#9a6b3b" },
    aurora_rider: { skin: "#f5c6a5", cheek: "#f28f79", iris: "#22d3ee", brow: "#232a3b" },
    siegesmith: { skin: "#f8ceb0", cheek: "#f0947d", iris: "#3b82f6", brow: "#5b3924" },
    chrono_tactician: { skin: "#f6cfb8", cheek: "#ec9788", iris: "#38bdf8", brow: "#1e2438" },
    oddling: { skin: "#fff0d6", cheek: "#ff9aa2", iris: "#2b2d42", brow: "#52b788" },
    slime_rime: { skin: "#5eead4", cheek: "#99f6e4", iris: "#fbbf24", brow: "#ccfbf1" },
    wisp_gloom: { skin: "#7c5cbf", cheek: "#a78bfa", iris: "#fcd34d", brow: "#ddd6fe" },
    guardian_ice: { skin: "#7dd3fc", cheek: "#bae6fd", iris: "#e0f2fe", brow: "#38bdf8" },
    guardian_tree: { skin: "#8d633a", cheek: "#a47548", iris: "#fde047", brow: "#4a3219" },
    guardian_knight: { skin: "#1e293b", cheek: "#334155", iris: "#38bdf8", brow: "#f59e0b" },
  };
  const pal = palettes[style] || palettes.alchemist;

  return makeCanvasOrFallbackTexture(
    key,
    256,
    (ctx, S) => {
      ctx.fillStyle = pal.skin;
      ctx.fillRect(0, 0, S, S);

      // Soft warm forehead/chin shading
      const grad = ctx.createLinearGradient(0, 0, 0, S);
      grad.addColorStop(0, "rgba(255,255,255,0.14)");
      grad.addColorStop(0.55, "rgba(255,255,255,0)");
      grad.addColorStop(1, "rgba(60,30,20,0.12)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, S, S);

      const cx = S * 0.5;
      const eyeY = S * 0.48;
      const eyeDX = S * 0.095;

      if (style === "slime_rime" || style === "wisp_gloom" || style.startsWith("guardian_")) {
        // Luminous magical eyes
        for (const side of [-1, 1]) {
          const ex = cx + side * eyeDX;
          ctx.save();
          ctx.shadowColor = pal.iris;
          ctx.shadowBlur = 14;
          ctx.fillStyle = pal.iris;
          ctx.beginPath();
          ctx.ellipse(ex, eyeY, S * 0.042, S * 0.052, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(ex - S * 0.012, eyeY - S * 0.015, S * 0.013, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        if (style === "guardian_tree" || style === "wisp_gloom" || style === "slime_rime") {
          ctx.strokeStyle = style === "guardian_tree" ? "#3f2712" : "rgba(255,255,255,0.75)";
          ctx.lineWidth = 4;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.arc(cx, S * 0.57, S * 0.055, 0.2, Math.PI - 0.2);
          ctx.stroke();
        }
        return;
      }

      // Rosy cheeks
      for (const side of [-1, 1]) {
        const rx = cx + side * (eyeDX * 1.25);
        const rg = ctx.createRadialGradient(rx, eyeY + S * 0.075, 2, rx, eyeY + S * 0.075, S * 0.055);
        rg.addColorStop(0, pal.cheek);
        rg.addColorStop(1, "rgba(255,160,150,0)");
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(rx, eyeY + S * 0.075, S * 0.055, 0, Math.PI * 2);
        ctx.fill();
      }

      // Expressive Pixar-style eyes
      for (const side of [-1, 1]) {
        const ex = cx + side * eyeDX;
        // Sclera
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.ellipse(ex, eyeY, S * 0.044, S * 0.05, 0, 0, Math.PI * 2);
        ctx.fill();

        // Colored iris
        ctx.fillStyle = pal.iris;
        ctx.beginPath();
        ctx.ellipse(ex, eyeY + 2, S * 0.031, S * 0.038, 0, 0, Math.PI * 2);
        ctx.fill();

        // Deep pupil
        ctx.fillStyle = "#141824";
        ctx.beginPath();
        ctx.arc(ex, eyeY + 3, S * 0.018, 0, Math.PI * 2);
        ctx.fill();

        // Twin specular catchlights
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(ex - S * 0.012, eyeY - S * 0.014, S * 0.011, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ex + S * 0.011, eyeY + S * 0.013, S * 0.005, 0, Math.PI * 2);
        ctx.fill();

        // Upper lash & friendly eyebrow
        ctx.strokeStyle = "#221814";
        ctx.lineWidth = 3.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(ex, eyeY + 2, S * 0.044, Math.PI * 1.12, Math.PI * 1.88);
        ctx.stroke();

        ctx.strokeStyle = pal.brow;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(ex, eyeY - S * 0.025, S * 0.048, Math.PI * 1.18, Math.PI * 1.82);
        ctx.stroke();
      }

      // Cheerful confident smile
      ctx.strokeStyle = "#7c3f2c";
      ctx.lineWidth = 3.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(cx, S * 0.565, S * 0.046, 0.22, Math.PI - 0.22);
      ctx.stroke();
    },
    (u, v) => {
      const eyeL = Math.hypot(u - 0.41, v - 0.48) < 0.05;
      const eyeR = Math.hypot(u - 0.59, v - 0.48) < 0.05;
      if (eyeL || eyeR) return [30, 180, 210, 255];
      return [248, 208, 182, 255];
    }
  );
}

/**
 * Rich painted fabric, armor, filigree, and wing textures.
 */
export function getCustomSurfaceTexture(theme = "alchemist_robe") {
  const key = `surf_${theme}`;
  return makeCanvasOrFallbackTexture(
    key,
    256,
    (ctx, S) => {
      if (theme === "alchemist_robe") {
        const g = ctx.createLinearGradient(0, 0, 0, S);
        g.addColorStop(0, "#0f766e");
        g.addColorStop(0.65, "#115e59");
        g.addColorStop(1, "#064e3b");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, S, S);
        // Gold-leaf embroidered trim & leaf runes
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 6;
        ctx.strokeRect(4, S - 28, S - 8, 18);
        ctx.lineWidth = 3;
        for (let x = 24; x < S; x += 48) {
          ctx.beginPath();
          ctx.moveTo(x, S - 36);
          ctx.quadraticCurveTo(x + 12, S - 64, x + 24, S - 36);
          ctx.stroke();
          ctx.fillStyle = "#5eead4";
          ctx.beginPath();
          ctx.arc(x + 12, S - 52, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (theme === "butterfly_wing") {
        ctx.clearRect(0, 0, S, S);
        const g = ctx.createRadialGradient(S * 0.2, S * 0.5, 10, S * 0.65, S * 0.5, S * 0.72);
        g.addColorStop(0, "rgba(186, 255, 244, 0.95)");
        g.addColorStop(0.55, "rgba(74, 222, 198, 0.82)");
        g.addColorStop(1, "rgba(20, 184, 166, 0.45)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, S, S);
        // Glowing wing veins & golden star-spots
        ctx.strokeStyle = "rgba(255, 251, 215, 0.9)";
        ctx.lineWidth = 3.5;
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.moveTo(8, S * 0.5);
          ctx.quadraticCurveTo(S * 0.45, S * (0.14 + i * 0.18), S * 0.92, S * (0.1 + i * 0.2));
          ctx.stroke();
        }
        ctx.fillStyle = "rgba(254, 240, 138, 0.92)";
        for (const [sx, sy, sr] of [
          [0.72, 0.26, 13],
          [0.78, 0.5, 16],
          [0.7, 0.74, 12],
          [0.48, 0.36, 9],
        ]) {
          ctx.beginPath();
          ctx.arc(S * sx, S * sy, sr, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (theme === "frostwake_hull") {
        const g = ctx.createLinearGradient(0, 0, 0, S);
        g.addColorStop(0, "#1aa6b7");
        g.addColorStop(0.55, "#0e7490");
        g.addColorStop(1, "#164e63");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, S, S);
        // Quilted panel seams + expedition amber stripe
        ctx.fillStyle = "#f59e0b";
        ctx.fillRect(0, S * 0.68, S, 18);
        ctx.strokeStyle = "rgba(165, 243, 252, 0.45)";
        ctx.lineWidth = 2.5;
        for (let i = 0; i < S; i += 32) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, S);
          ctx.stroke();
        }
      } else if (theme === "aurora_wing") {
        const g = ctx.createLinearGradient(0, 0, S, S);
        g.addColorStop(0, "#e0f2fe");
        g.addColorStop(0.5, "#38bdf8");
        g.addColorStop(1, "#0284c7");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, S, S);
        ctx.strokeStyle = "#67e8f9";
        ctx.lineWidth = 5;
        ctx.strokeRect(10, 10, S - 20, S - 20);
      } else if (theme === "bastion_brass_plate") {
        const g = ctx.createLinearGradient(0, 0, S, S);
        g.addColorStop(0, "#fbbf24");
        g.addColorStop(0.5, "#d97706");
        g.addColorStop(1, "#92400e");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, S, S);
        ctx.strokeStyle = "#fef3c7";
        ctx.lineWidth = 3;
        ctx.strokeRect(8, 8, S - 16, S - 16);
        ctx.fillStyle = "#fef08a";
        for (let x = 20; x <= S - 20; x += 36) {
          ctx.beginPath();
          ctx.arc(x, 20, 4, 0, Math.PI * 2);
          ctx.arc(x, S - 20, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // sapphire_filigree
        const g = ctx.createLinearGradient(0, 0, 0, S);
        g.addColorStop(0, "#2563eb");
        g.addColorStop(0.55, "#1d4ed8");
        g.addColorStop(1, "#1e3a8a");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, S, S);
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 5;
        ctx.strokeRect(6, 6, S - 12, S - 12);
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, S * 0.5);
        ctx.lineTo(S, S * 0.5);
        ctx.stroke();
      }
    },
    (u, v) => {
      if (theme === "bastion_brass_plate") return [225, 165, 45, 255];
      if (theme === "sapphire_filigree") return [40, 105, 230, 255];
      if (theme === "butterfly_wing") return [120, 245, 225, 220];
      return [24, 150, 145, 255];
    }
  );
}

/**
 * Painted organic skins (starry amphibian, mossy fur, crystal fox coat, constellation whale).
 */
export function getCreatureSkinTexture(species = "fox") {
  const key = `skin_${species}`;
  return makeCanvasOrFallbackTexture(
    key,
    256,
    (ctx, S) => {
      if (species === "toad" || species === "whale") {
        const g = ctx.createLinearGradient(0, 0, 0, S);
        g.addColorStop(0, "#312e81");
        g.addColorStop(0.5, "#1d4ed8");
        g.addColorStop(1, "#2dd4bf");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, S, S);
        // Constellation star speckles & lines
        ctx.fillStyle = "#fef9c3";
        for (let i = 0; i < 42; i++) {
          const sx = ((i * 73 + 19) % 240) + 8;
          const sy = ((i * 137 + 31) % 240) + 8;
          const r = (i % 3) + 1.4;
          ctx.beginPath();
          ctx.arc(sx, sy, r, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (species === "boar") {
        const g = ctx.createLinearGradient(0, 0, 0, S);
        g.addColorStop(0, "#4ade80");
        g.addColorStop(0.45, "#22c55e");
        g.addColorStop(1, "#14532d");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, S, S);
        ctx.strokeStyle = "rgba(187, 247, 208, 0.36)";
        ctx.lineWidth = 3;
        for (let i = 0; i < 40; i++) {
          const fx = (i * 47) % S;
          const fy = (i * 83) % S;
          ctx.beginPath();
          ctx.moveTo(fx, fy);
          ctx.lineTo(fx + 6, fy + 16);
          ctx.stroke();
        }
      } else if (species === "stag") {
        const g = ctx.createLinearGradient(0, 0, 0, S);
        g.addColorStop(0, "#1e1b4b");
        g.addColorStop(0.6, "#312e81");
        g.addColorStop(1, "#4338ca");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, S, S);
        ctx.fillStyle = "rgba(253, 224, 71, 0.5)";
        for (let i = 0; i < 18; i++) {
          ctx.beginPath();
          ctx.arc(((i * 61) % 220) + 18, ((i * 97) % 220) + 18, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Crystal Spirit Fox warm amber + glowing turquoise coat
        const g = ctx.createLinearGradient(0, 0, 0, S);
        g.addColorStop(0, "#5eead4");
        g.addColorStop(0.45, "#fbbf24");
        g.addColorStop(0.82, "#fffbeb");
        g.addColorStop(1, "#2dd4bf");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, S, S);
      }
    },
    () => [70, 205, 195, 255]
  );
}

/* ==================== SCULPTED GEOMETRY HELPERS ==================== */

export function createLatheProfileGeometry(profilePairs, radialSegments = 18) {
  const pts = profilePairs.map(([r, y]) => new THREE.Vector2(Math.max(0.001, r), y));
  const geo = new THREE.LatheGeometry(pts, radialSegments);
  geo.computeVertexNormals();
  return geo;
}

export function createBeveledWingGeometry(points2D, depth = 0.04, bevelSize = 0.018) {
  const shape = new THREE.Shape();
  points2D.forEach(([x, y], idx) => {
    if (idx === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize,
    bevelThickness: bevelSize,
  });
  geo.computeVertexNormals();
  const uv = geo.attributes.uv;
  if (uv && uv.count > 0) {
    let minU = Infinity;
    let maxU = -Infinity;
    let minV = Infinity;
    let maxV = -Infinity;
    for (let i = 0; i < uv.count; i++) {
      const u = uv.getX(i);
      const v = uv.getY(i);
      if (u < minU) minU = u;
      if (u > maxU) maxU = u;
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }
    const spanU = Math.max(1e-4, maxU - minU);
    const spanV = Math.max(1e-4, maxV - minV);
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, (uv.getX(i) - minU) / spanU, (uv.getY(i) - minV) / spanV);
    }
    uv.needsUpdate = true;
  }
  return geo;
}

export function createSplineTubeGeometry(points3D, radius = 0.08, tubularSegments = 18, radialSegments = 10) {
  const curve = new THREE.CatmullRomCurve3(
    points3D.map(([x, y, z]) => new THREE.Vector3(x, y, z))
  );
  const geo = new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false);
  geo.computeVertexNormals();
  return geo;
}

/* ==================== ARTICULATED EXPLORER & PILOT CHARACTERS ==================== */

/**
 * Builds an expressive, organic, non-primitive 3D character for any of the 3 games:
 * - "arctic_engineer" (Frostwake Dozer pilot)
 * - "aurora_rider"    (Frostwake Sled pilot with billowing ribbon scarf)
 * - "alchemist"       (Oddroot Starlight Glide-Cape Alchemist or Boar rider)
 * - "siegesmith"      (Arc Bastion 6x6 Ballista inventor)
 * - "chrono_tactician"(Arc Bastion Prism Skiff pilot with crystal visor)
 */
export function buildExplorerPilot3D({
  role = "alchemist",
  scale = 1.0,
  includeWings = false,
  seated = false,
} = {}) {
  const gradMap = getCharacterToonGradient();
  const root = new THREE.Group();
  root.name = `custom_character_${role}`;

  const robeTheme =
    role === "alchemist"
      ? "alchemist_robe"
      : role === "siegesmith" || role === "chrono_tactician"
      ? "sapphire_filigree"
      : "frostwake_hull";

  const tunicMat = new THREE.MeshToonMaterial({
    map: getCustomSurfaceTexture(robeTheme),
    gradientMap: gradMap,
  });
  const faceMat = new THREE.MeshToonMaterial({
    map: getCharacterFaceTexture(role),
    gradientMap: gradMap,
  });
  const trimGoldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.3,
    metalness: 0.65,
    emissive: 0x78350f,
    emissiveIntensity: 0.2,
  });
  const glowCyanMat = new THREE.MeshStandardMaterial({
    color: 0x67e8f9,
    roughness: 0.18,
    metalness: 0.15,
    emissive: 0x22d3ee,
    emissiveIntensity: 0.65,
    transparent: true,
    opacity: 0.88,
  });
  const bootMat = new THREE.MeshToonMaterial({
    color: role === "alchemist" ? 0x4a2c18 : 0x1e293b,
    gradientMap: gradMap,
  });

  // 1. Sculpted contoured torso / flared coat (LatheGeometry — zero raw cylinder!)
  const torsoProfile =
    role === "alchemist"
      ? [
          [0.02, 0.0],
          [0.42, 0.02],
          [0.37, 0.32],
          [0.25, 0.62],
          [0.29, 0.88],
          [0.16, 1.04],
          [0.01, 1.06],
        ]
      : [
          [0.02, 0.0],
          [0.33, 0.04],
          [0.31, 0.38],
          [0.28, 0.72],
          [0.31, 0.94],
          [0.17, 1.06],
          [0.01, 1.08],
        ];
  const torso = new THREE.Mesh(createLatheProfileGeometry(torsoProfile, 20), tunicMat);
  torso.position.y = seated ? 0.18 : 0.42;
  torso.castShadow = true;
  root.add(torso);

  // Golden belt / collar ring
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.036, 10, 22), trimGoldMat);
  belt.rotation.x = Math.PI / 2;
  belt.position.y = torso.position.y + 0.46;
  root.add(belt);

  // 2. Head Group with painted face texture + 3D nose & ears
  const headPivot = new THREE.Group();
  headPivot.name = "character_head_pivot";
  headPivot.position.set(0, torso.position.y + 1.24, 0);

  const headGeo = new THREE.SphereGeometry(0.29, 24, 20);
  const headMesh = new THREE.Mesh(headGeo, faceMat);
  // Rotate so u=0.5 faces -Z (forward in vehicle/avatar local space)
  headMesh.rotation.y = Math.PI * 0.5;
  headMesh.scale.set(1.0, 0.96, 0.98);
  headPivot.add(headMesh);

  const noseMat = new THREE.MeshToonMaterial({ color: 0xf4b697, gradientMap: gradMap });
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 10), noseMat);
  nose.position.set(0, -0.02, -0.285);
  headPivot.add(nose);

  // Role-specific sculpted headwear / hair / goggles / visor
  if (role === "alchemist") {
    // Rich brown sculpted hair locks
    const hairMat = new THREE.MeshToonMaterial({ color: 0x4e3222, gradientMap: gradMap });
    const hairBack = new THREE.Mesh(
      new THREE.SphereGeometry(0.305, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.62),
      hairMat
    );
    hairBack.rotation.x = -0.24;
    headPivot.add(hairBack);

    // Curved Alchemist Hat: wavy Lathe brim + curved spline Tube crown + golden crescent buckle!
    const hatMat = new THREE.MeshToonMaterial({ color: 0x15803d, gradientMap: gradMap });
    const brim = new THREE.Mesh(
      createLatheProfileGeometry(
        [
          [0.18, 0.04],
          [0.36, 0.02],
          [0.54, -0.04],
          [0.58, -0.02],
          [0.34, 0.07],
        ],
        22
      ),
      hatMat
    );
    brim.position.y = 0.16;
    brim.rotation.x = -0.1;
    headPivot.add(brim);

    const hatCrown = new THREE.Mesh(
      createLatheProfileGeometry(
        [
          [0.29, 0.15],
          [0.24, 0.36],
          [0.15, 0.58],
          [0.07, 0.76],
          [0.01, 0.86],
        ],
        18
      ),
      hatMat
    );
    hatCrown.rotation.z = 0.18;
    hatCrown.rotation.x = 0.12;
    headPivot.add(hatCrown);

    const hatCurl = new THREE.Mesh(
      createSplineTubeGeometry(
        [
          [-0.08, 0.74, -0.04],
          [-0.2, 0.84, 0.06],
          [-0.28, 0.72, 0.14],
        ],
        0.045,
        12,
        8
      ),
      hatMat
    );
    headPivot.add(hatCurl);

    const hatBand = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.032, 8, 20), trimGoldMat);
    hatBand.rotation.x = Math.PI / 2 - 0.1;
    hatBand.position.y = 0.2;
    headPivot.add(hatBand);
  } else if (role === "arctic_engineer") {
    // Blonde side-swept hair + plush fur-lined hood + cyan snow goggles
    const furMat = new THREE.MeshToonMaterial({ color: 0xfef3c7, gradientMap: gradMap });
    const hoodRim = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.075, 12, 22), furMat);
    hoodRim.position.set(0, 0.02, 0.04);
    headPivot.add(hoodRim);

    const goggleFrame = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.09, 0.24, 8, 14),
      trimGoldMat
    );
    goggleFrame.rotation.z = Math.PI / 2;
    goggleFrame.position.set(0, 0.17, -0.22);
    headPivot.add(goggleFrame);

    const goggleLens = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.072, 0.22, 8, 14),
      glowCyanMat
    );
    goggleLens.rotation.z = Math.PI / 2;
    goggleLens.position.set(0, 0.17, -0.25);
    headPivot.add(goggleLens);
  } else if (role === "aurora_rider") {
    // Windswept dark-slate spiky hair + glowing aurora scarf!
    const hairMat = new THREE.MeshToonMaterial({ color: 0x1e293b, gradientMap: gradMap });
    const hairDome = new THREE.Mesh(new THREE.SphereGeometry(0.305, 18, 14), hairMat);
    hairDome.position.set(0, 0.06, 0.05);
    headPivot.add(hairDome);
    for (let i = -1; i <= 1; i++) {
      const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.26, 8), hairMat);
      tuft.position.set(i * 0.11, 0.3, 0.08);
      tuft.rotation.x = -0.55;
      tuft.rotation.z = -i * 0.25;
      headPivot.add(tuft);
    }
  } else if (role === "siegesmith") {
    //Tousled copper-brown hair + twin round brass clockwork goggles!
    const hairMat = new THREE.MeshToonMaterial({ color: 0x6b3e26, gradientMap: gradMap });
    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.305, 18, 14), hairMat);
    hairCap.position.set(0, 0.07, 0.04);
    headPivot.add(hairCap);
    for (const sx of [-0.1, 0.1]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.022, 10, 18), trimGoldMat);
      rim.position.set(sx, 0.16, -0.24);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 14), glowCyanMat);
      lens.rotation.x = Math.PI / 2;
      lens.position.set(sx, 0.16, -0.24);
      headPivot.add(rim, lens);
    }
  } else {
    // chrono_tactician: sleek dark bob + wrap-around crystal visor + golden ear-winglets
    const hairMat = new THREE.MeshToonMaterial({ color: 0x172033, gradientMap: gradMap });
    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.305, 18, 14), hairMat);
    hairCap.position.set(0, 0.06, 0.03);
    headPivot.add(hairCap);

    const visor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.315, 0.305, 0.14, 20, 1, true, Math.PI * 0.68, Math.PI * 0.64),
      glowCyanMat
    );
    visor.position.set(0, 0.03, 0);
    headPivot.add(visor);

    for (const sx of [-1, 1]) {
      const winglet = new THREE.Mesh(
        createBeveledWingGeometry(
          [
            [0, 0],
            [0.16, 0.22],
            [0.05, 0.26],
            [-0.04, 0.06],
          ],
          0.025,
          0.008
        ),
        trimGoldMat
      );
      winglet.position.set(sx * 0.29, 0.04, 0.02);
      winglet.rotation.y = sx * 0.35;
      headPivot.add(winglet);
    }
  }

  root.add(headPivot);

  // 3. Articulated Left & Right Arms + Mittens/Gloves
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.32, torso.position.y + 0.88, 0);
  const rightArm = new THREE.Group();
  rightArm.position.set(0.32, torso.position.y + 0.88, 0);

  const sleeveGeo = new THREE.CapsuleGeometry(0.085, 0.34, 8, 12);
  const handGeo = new THREE.SphereGeometry(0.095, 12, 10);
  for (const [arm, sign] of [
    [leftArm, -1],
    [rightArm, 1],
  ]) {
    const sleeve = new THREE.Mesh(sleeveGeo, tunicMat);
    sleeve.position.set(sign * 0.04, -0.18, -0.08);
    sleeve.rotation.x = seated ? -0.75 : -0.32;
    sleeve.rotation.z = sign * 0.22;
    const glove = new THREE.Mesh(handGeo, bootMat);
    glove.position.set(sign * 0.08, seated ? -0.28 : -0.38, seated ? -0.28 : -0.18);
    arm.add(sleeve, glove);
  }
  root.add(leftArm, rightArm);

  // 4. Articulated Legs & Sculpted Boots (when standing/gliding)
  const leftLeg = new THREE.Group();
  const rightLeg = new THREE.Group();
  if (!seated) {
    leftLeg.position.set(-0.14, 0.44, 0);
    rightLeg.position.set(0.14, 0.44, 0);
    const legGeo = new THREE.CapsuleGeometry(0.09, 0.26, 8, 12);
    const footGeo = new THREE.CapsuleGeometry(0.085, 0.14, 8, 12);
    for (const leg of [leftLeg, rightLeg]) {
      const shin = new THREE.Mesh(legGeo, bootMat);
      shin.position.y = -0.2;
      const boot = new THREE.Mesh(footGeo, bootMat);
      boot.rotation.x = Math.PI / 2;
      boot.position.set(0, -0.37, -0.05);
      leg.add(shin, boot);
    }
    root.add(leftLeg, rightLeg);
  }

  // 5. Flowing Ribbon Scarf (Aurora Rider & Arctic Engineer & Alchemist)
  let scarfGroup = null;
  if (role === "aurora_rider" || role === "arctic_engineer" || role === "alchemist") {
    scarfGroup = new THREE.Group();
    scarfGroup.name = "pilot_flowing_scarf";
    scarfGroup.position.set(0, torso.position.y + 0.98, 0.14);
    const scarfMat = new THREE.MeshStandardMaterial({
      color: role === "alchemist" ? 0x5eead4 : 0x22d3ee,
      emissive: 0x0d9488,
      emissiveIntensity: 0.42,
      roughness: 0.35,
    });
    const neckRing = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.055, 10, 18), scarfMat);
    neckRing.rotation.x = Math.PI / 2;
    neckRing.position.z = -0.14;
    const streamerL = new THREE.Mesh(
      createSplineTubeGeometry(
        [
          [-0.06, 0, 0],
          [-0.16, -0.08, 0.42],
          [-0.24, 0.04, 0.88],
        ],
        0.052,
        14,
        8
      ),
      scarfMat
    );
    const streamerR = new THREE.Mesh(
      createSplineTubeGeometry(
        [
          [0.08, -0.02, 0],
          [0.18, -0.12, 0.36],
          [0.26, -0.02, 0.76],
        ],
        0.044,
        14,
        8
      ),
      scarfMat
    );
    scarfGroup.add(neckRing, streamerL, streamerR);
    root.add(scarfGroup);
  }

  // 6. Contoured Butterfly-Owl Starlight Glide-Wings (for Oddroot Alchemist!)
  let leftWing = null;
  let rightWing = null;
  if (includeWings) {
    const wingMat = new THREE.MeshStandardMaterial({
      map: getCustomSurfaceTexture("butterfly_wing"),
      color: 0xa7f3d0,
      emissive: 0x2dd4bf,
      emissiveIntensity: 0.55,
      transparent: true,
      opacity: 0.9,
      roughness: 0.22,
      side: THREE.DoubleSide,
    });
    const upperWingShape = [
      [0.0, 0.0],
      [0.45, 0.42],
      [1.08, 0.56],
      [1.24, 0.36],
      [1.02, 0.06],
      [0.58, -0.08],
    ];
    const lowerWingShape = [
      [0.0, -0.04],
      [0.52, -0.06],
      [0.86, -0.34],
      [0.64, -0.62],
      [0.24, -0.44],
    ];
    const upperGeo = createBeveledWingGeometry(upperWingShape, 0.024, 0.01);
    const lowerGeo = createBeveledWingGeometry(lowerWingShape, 0.02, 0.008);

    leftWing = new THREE.Group();
    leftWing.name = "starlight_wing_left";
    leftWing.position.set(-0.14, torso.position.y + 0.78, 0.2);
    const lwU = new THREE.Mesh(upperGeo, wingMat);
    const lwL = new THREE.Mesh(lowerGeo, wingMat);
    leftWing.scale.x = -1;
    leftWing.rotation.y = 0.28;
    leftWing.add(lwU, lwL);

    rightWing = new THREE.Group();
    rightWing.name = "starlight_wing_right";
    rightWing.position.set(0.14, torso.position.y + 0.78, 0.2);
    const rwU = new THREE.Mesh(upperGeo, wingMat);
    const rwL = new THREE.Mesh(lowerGeo, wingMat);
    rightWing.rotation.y = -0.28;
    rightWing.add(rwU, rwL);

    root.add(leftWing, rightWing);
  }

  root.scale.setScalar(scale);
  root.userData.animRefs = {
    headPivot,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    scarfGroup,
    leftWing,
    rightWing,
    seated,
  };
  return root;
}

/**
 * Animates pilot/alchemist secondary motion smoothly at 60fps.
 */
export function animateExplorerPilot3D(
  pilotGroup,
  elapsed = 0,
  speedNorm = 0,
  steer = 0,
  isAirborne = false
) {
  const refs = pilotGroup?.userData?.animRefs;
  if (!refs) return;
  const spd = Math.max(0, Math.min(1.5, Number(speedNorm) || 0));
  const st = Math.max(-1, Math.min(1, Number(steer) || 0));

  if (refs.headPivot) {
    refs.headPivot.rotation.y = -st * 0.35 + Math.sin(elapsed * 2.1) * 0.05;
    refs.headPivot.rotation.z = -st * 0.12;
  }
  if (!refs.seated) {
    const stride = Math.sin(elapsed * (6.5 + spd * 5.0)) * (isAirborne ? 0.12 : 0.38 * spd);
    if (refs.leftLeg) refs.leftLeg.rotation.x = stride;
    if (refs.rightLeg) refs.rightLeg.rotation.x = -stride;
    if (refs.leftArm) refs.leftArm.rotation.x = -stride * 0.65;
    if (refs.rightArm) refs.rightArm.rotation.x = stride * 0.65;
  }
  if (refs.scarfGroup) {
    refs.scarfGroup.rotation.x = 0.08 + spd * 0.28 + Math.sin(elapsed * 9.0) * (0.06 + spd * 0.08);
    refs.scarfGroup.rotation.y = st * 0.25 + Math.cos(elapsed * 6.5) * 0.08;
  }
  if (refs.leftWing && refs.rightWing) {
    const flapFreq = isAirborne ? 5.2 : 3.4 + spd * 4.2;
    const flapAmp = isAirborne ? 0.24 : 0.18 + spd * 0.22;
    const flap = Math.sin(elapsed * flapFreq) * flapAmp;
    refs.leftWing.rotation.y = 0.32 + flap;
    refs.rightWing.rotation.y = -0.32 - flap;
  }
}

/* ==================== SCULPTED SPIRIT CREATURES & SKY-WHALE ==================== */

export function buildSpiritFox3D({ scale = 1.0 } = {}) {
  const gradMap = getCharacterToonGradient();
  const g = new THREE.Group();
  g.name = "custom_spirit_fox";

  const coatMat = new THREE.MeshToonMaterial({
    map: getCreatureSkinTexture("fox"),
    gradientMap: gradMap,
  });
  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0x5eead4,
    emissive: 0x14b8a6,
    emissiveIntensity: 0.6,
    roughness: 0.18,
    transparent: true,
    opacity: 0.9,
  });

  // Sculpted lithe fox torso
  const body = new THREE.Mesh(
    createLatheProfileGeometry(
      [
        [0.02, -0.45],
        [0.21, -0.32],
        [0.24, 0.0],
        [0.27, 0.28],
        [0.18, 0.46],
        [0.02, 0.52],
      ],
      16
    ),
    coatMat
  );
  body.rotation.x = Math.PI / 2 - 0.18;
  body.position.set(0, 0.46, 0);
  g.add(body);

  // Fluffy chest ruff
  const ruff = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), crystalMat);
  ruff.scale.set(1.05, 0.95, 0.85);
  ruff.position.set(0, 0.52, -0.32);
  g.add(ruff);

  // Expressive fox head + snout + tall crystal-tipped ears
  const head = new THREE.Group();
  head.position.set(0, 0.78, -0.42);
  const skull = new THREE.Mesh(
    new THREE.SphereGeometry(0.23, 20, 16),
    new THREE.MeshToonMaterial({
      map: getCharacterFaceTexture("arctic_engineer"),
      gradientMap: gradMap,
    })
  );
  skull.rotation.y = Math.PI * 0.5;
  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.24, 12), coatMat);
  snout.rotation.x = -Math.PI / 2;
  snout.position.set(0, -0.05, -0.24);
  const nose = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0x1e293b })
  );
  nose.position.set(0, -0.04, -0.35);
  head.add(skull, snout, nose);

  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(
      createBeveledWingGeometry(
        [
          [-0.08, 0],
          [0.0, 0.3],
          [0.08, 0],
        ],
        0.03,
        0.01
      ),
      crystalMat
    );
    ear.position.set(sx * 0.13, 0.16, -0.02);
    ear.rotation.z = -sx * 0.22;
    head.add(ear);
  }
  g.add(head);

  // 4 slender paws
  const pawGeo = new THREE.CapsuleGeometry(0.055, 0.26, 6, 10);
  for (const [px, pz] of [
    [-0.13, -0.26],
    [0.13, -0.26],
    [-0.14, 0.24],
    [0.14, 0.24],
  ]) {
    const paw = new THREE.Mesh(pawGeo, coatMat);
    paw.position.set(px, 0.2, pz);
    g.add(paw);
  }

  // Lush S-curved crystal plume tail
  const tail = new THREE.Mesh(
    createSplineTubeGeometry(
      [
        [0, 0.44, 0.42],
        [0.06, 0.62, 0.76],
        [0.0, 0.92, 0.92],
        [-0.04, 1.08, 0.78],
      ],
      0.13,
      16,
      10
    ),
    crystalMat
  );
  tail.name = "fox_plume_tail";
  g.add(tail);

  g.scale.setScalar(scale);
  g.userData.head = head;
  g.userData.tail = tail;
  return g;
}

export function buildSkyWhale3D({ theme = "frostwake", scale = 1.0 } = {}) {
  const g = new THREE.Group();
  g.name = `custom_sky_whale_${theme}`;
  const skinMat = new THREE.MeshStandardMaterial({
    map: getCreatureSkinTexture("whale"),
    color: theme === "arc_bastion" ? 0x60a5fa : 0x67e8f9,
    emissive: theme === "oddroot" ? 0x2dd4bf : 0x0284c7,
    emissiveIntensity: 0.48,
    roughness: 0.26,
    transparent: true,
    opacity: 0.92,
  });
  const bellyMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: 0x7dd3fc,
    emissiveIntensity: 0.35,
    roughness: 0.32,
  });

  // Contoured humpback whale hull along Z
  const hull = new THREE.Mesh(
    createLatheProfileGeometry(
      [
        [0.05, -4.6],
        [0.35, -3.5],
        [0.85, -1.8],
        [1.45, 0.2],
        [1.72, 1.8],
        [1.48, 3.1],
        [0.75, 4.0],
        [0.05, 4.3],
      ],
      22
    ),
    skinMat
  );
  hull.rotation.x = Math.PI / 2;
  hull.scale.set(1.08, 0.86, 1.0);
  g.add(hull);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(1.32, 18, 14), bellyMat);
  belly.scale.set(0.95, 0.55, 1.9);
  belly.position.set(0, -0.42, 1.3);
  g.add(belly);

  // Glowing gentle eyes
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), eyeMat);
    eye.position.set(sx * 1.42, 0.08, 2.55);
    g.add(eye);
  }

  // Swept pectoral fins + wide tail fluke
  const finGeo = createBeveledWingGeometry(
    [
      [0, 0],
      [2.4, -0.5],
      [2.8, -1.2],
      [1.5, -1.1],
      [0.2, -0.5],
    ],
    0.1,
    0.04
  );
  const leftFin = new THREE.Mesh(finGeo, skinMat);
  leftFin.rotation.x = Math.PI / 2;
  leftFin.scale.x = -1;
  leftFin.position.set(-1.35, -0.25, 1.2);
  const rightFin = new THREE.Mesh(finGeo, skinMat);
  rightFin.rotation.x = Math.PI / 2;
  rightFin.position.set(1.35, -0.25, 1.2);

  const flukeGeo = createBeveledWingGeometry(
    [
      [0, 0.2],
      [2.1, -0.7],
      [1.8, -1.3],
      [0, -0.6],
      [-1.8, -1.3],
      [-2.1, -0.7],
    ],
    0.1,
    0.04
  );
  const tailFluke = new THREE.Mesh(flukeGeo, skinMat);
  tailFluke.rotation.x = Math.PI / 2;
  tailFluke.position.set(0, 0.05, -4.35);

  g.add(leftFin, rightFin, tailFluke);
  g.scale.setScalar(scale);
  g.userData.fins = { leftFin, rightFin, tailFluke };
  return g;
}

/**
 * Builds sculpted Bramble-Plow Spirit Boar mount (matching bramble-boar.png)
 * with mossy fur texture, rounded snout, floppy ears, curved ivory/gold tusks,
 * glowing fern crest, warm lantern saddle, and seated Alchemist rider!
 */
export function buildBrambleBoarMount3D({ withRider = true, scale = 1.0 } = {}) {
  const gradMap = getCharacterToonGradient();
  const g = new THREE.Group();
  g.name = "custom_bramble_boar";

  const boarFurMat = new THREE.MeshToonMaterial({
    map: getCreatureSkinTexture("boar"),
    gradientMap: gradMap,
  });
  const snoutMat = new THREE.MeshToonMaterial({ color: 0xf4a28c, gradientMap: gradMap });
  const tuskMat = new THREE.MeshStandardMaterial({
    color: 0xfde68a,
    roughness: 0.25,
    metalness: 0.35,
  });
  const fernGlowMat = new THREE.MeshStandardMaterial({
    color: 0x5eead4,
    emissive: 0x14b8a6,
    emissiveIntensity: 0.65,
    roughness: 0.25,
    side: THREE.DoubleSide,
  });
  const leatherMat = new THREE.MeshToonMaterial({ color: 0x7c4a24, gradientMap: gradMap });
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });

  // Plump sculpted boar body
  const body = new THREE.Mesh(
    createLatheProfileGeometry(
      [
        [0.05, -1.15],
        [0.62, -0.9],
        [0.82, -0.25],
        [0.88, 0.38],
        [0.68, 0.92],
        [0.24, 1.2],
        [0.03, 1.26],
      ],
      20
    ),
    boarFurMat
  );
  body.rotation.x = -Math.PI / 2;
  body.scale.set(0.95, 0.92, 1.0);
  body.position.set(0, 0.96, 0);
  body.castShadow = true;
  g.add(body);

  // Pink snout disc + nostrils + warm eyes + floppy ears
  const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.24, 16), snoutMat);
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, 0.82, -1.24);
  g.add(snout);

  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1e1b18, roughness: 0.15 });
  const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), eyeMat);
    eye.position.set(sx * 0.36, 1.08, -0.98);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), shineMat);
    shine.position.set(sx * 0.38, 1.11, -1.05);
    g.add(eye, shine);

    // Curved ivory-gold tusks
    const tusk = new THREE.Mesh(
      createSplineTubeGeometry(
        [
          [sx * 0.26, 0.72, -1.12],
          [sx * 0.48, 0.82, -1.36],
          [sx * 0.42, 1.12, -1.32],
        ],
        0.062,
        14,
        10
      ),
      tuskMat
    );
    g.add(tusk);

    // Perky mossy ears
    const ear = new THREE.Mesh(
      createBeveledWingGeometry(
        [
          [-0.12, 0],
          [0, 0.36],
          [0.14, 0.04],
        ],
        0.04,
        0.012
      ),
      boarFurMat
    );
    ear.position.set(sx * 0.42, 1.42, -0.68);
    ear.rotation.z = -sx * 0.35;
    g.add(ear);
  }

  // Bioluminescent fern crest along brow/crown
  for (let i = -1; i <= 1; i++) {
    const frond = new THREE.Mesh(
      createBeveledWingGeometry(
        [
          [0, 0],
          [0.12, 0.38],
          [0, 0.62],
          [-0.12, 0.38],
        ],
        0.02,
        0.008
      ),
      fernGlowMat
    );
    frond.position.set(i * 0.14, 1.56, -0.45 + Math.abs(i) * 0.12);
    frond.rotation.z = -i * 0.32;
    frond.rotation.x = -0.22;
    g.add(frond);
  }

  // Leather saddle + glowing side lantern
  const saddle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.56, 0.62, 0.7, 16, 1, false, -Math.PI * 0.45, Math.PI * 0.9),
    leatherMat
  );
  saddle.rotation.z = Math.PI / 2;
  saddle.rotation.y = Math.PI / 2;
  saddle.position.set(0, 1.32, 0.15);
  g.add(saddle);

  const lantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 1), lanternMat);
  lantern.position.set(-0.78, 1.05, 0.2);
  g.add(lantern);

  // 4 sturdy legs with hooves
  const legGeo = new THREE.CapsuleGeometry(0.14, 0.38, 8, 10);
  const legs = [];
  for (const [lx, lz] of [
    [-0.42, -0.58],
    [0.42, -0.58],
    [-0.44, 0.56],
    [0.44, 0.56],
  ]) {
    const leg = new THREE.Mesh(legGeo, boarFurMat);
    leg.position.set(lx, 0.34, lz);
    legs.push(leg);
    g.add(leg);
  }

  if (withRider) {
    const rider = buildExplorerPilot3D({
      role: "alchemist",
      scale: 0.78,
      includeWings: false,
      seated: true,
    });
    rider.position.set(0, 1.56, 0.12);
    g.add(rider);
    g.userData.rider = rider;
  }

  g.userData.legs = legs;
  g.scale.setScalar(scale);
  return g;
}

/* ==================== SANCTUARY MENAGERIE SCULPTED CREATURES ==================== */

export function buildSanctuaryCreature3D(speciesId, stage = 1) {
  const gradMap = getCharacterToonGradient();
  const stageScale = 1 + (Math.max(1, stage) - 1) * 0.16;

  if (speciesId === "crystal_fox") {
    return buildSpiritFox3D({ scale: 0.95 * stageScale });
  }
  if (speciesId === "starlight_whale") {
    return buildSkyWhale3D({ theme: "oddroot", scale: 0.42 * stageScale });
  }

  const root = new THREE.Group();
  root.name = `sculpted_${speciesId}`;

  if (speciesId === "zero_g_toad") {
    const toadMat = new THREE.MeshToonMaterial({
      map: getCreatureSkinTexture("toad"),
      gradientMap: gradMap,
    });
    const bellyMat = new THREE.MeshToonMaterial({ color: 0x99f6e4, gradientMap: gradMap });
    const bubbleHelmMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.25,
      roughness: 0.08,
      transparent: true,
      opacity: 0.36,
    });

    // Plump starry amphibian body
    const body = new THREE.Mesh(
      createLatheProfileGeometry(
        [
          [0.04, -0.42],
          [0.38, -0.34],
          [0.52, -0.05],
          [0.48, 0.28],
          [0.32, 0.48],
          [0.04, 0.54],
        ],
        20
      ),
      toadMat
    );
    root.add(body);

    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 14), bellyMat);
    belly.scale.set(0.95, 0.85, 0.55);
    belly.position.set(0, -0.04, -0.24);
    root.add(belly);

    // Big golden frog eyes + space-bubble helmet
    const goldEyeMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 0.4,
      roughness: 0.2,
    });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x171717 });
    for (const sx of [-1, 1]) {
      const socket = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), toadMat);
      socket.position.set(sx * 0.22, 0.42, -0.18);
      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), goldEyeMat);
      iris.position.set(sx * 0.23, 0.43, -0.24);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), pupilMat);
      pupil.position.set(sx * 0.24, 0.43, -0.31);
      root.add(socket, iris, pupil);

      // Webbed hands & hind legs
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.22, 6, 10), toadMat);
      arm.position.set(sx * 0.44, 0.08, -0.16);
      arm.rotation.z = sx * 0.55;
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.28, 6, 10), toadMat);
      leg.position.set(sx * 0.36, -0.38, 0.04);
      leg.rotation.z = sx * 0.35;
      root.add(arm, leg);
    }

    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.46, 20, 16), bubbleHelmMat);
    helm.position.set(0, 0.34, -0.08);
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.36, 0.04, 10, 22),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.6, roughness: 0.25 })
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.16, -0.06);
    root.add(helm, collar);

    root.scale.setScalar(stageScale);
    return root;
  }

  if (speciesId === "eclipse_stag") {
    const stagMat = new THREE.MeshToonMaterial({
      map: getCreatureSkinTexture("stag"),
      gradientMap: gradMap,
    });
    const goldAntlerMat = new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.78,
      roughness: 0.22,
    });

    const torso = new THREE.Mesh(
      createLatheProfileGeometry(
        [
          [0.04, -0.62],
          [0.32, -0.45],
          [0.38, 0.12],
          [0.34, 0.54],
          [0.04, 0.66],
        ],
        18
      ),
      stagMat
    );
    torso.rotation.x = Math.PI / 2;
    torso.position.set(0, 0.86, 0);
    root.add(torso);

    const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.48, 8, 12), stagMat);
    neck.position.set(0, 1.24, -0.44);
    neck.rotation.x = 0.28;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.21, 16, 14),
      new THREE.MeshToonMaterial({
        map: getCharacterFaceTexture("aurora_rider"),
        gradientMap: gradMap,
      })
    );
    head.rotation.y = Math.PI * 0.5;
    head.scale.set(0.9, 0.9, 1.25);
    head.position.set(0, 1.56, -0.58);
    root.add(neck, head);

    // Branching golden crescent antlers + radiant solar orb
    for (const sx of [-1, 1]) {
      const mainBranch = new THREE.Mesh(
        createSplineTubeGeometry(
          [
            [sx * 0.08, 1.72, -0.56],
            [sx * 0.34, 2.02, -0.52],
            [sx * 0.24, 2.38, -0.48],
          ],
          0.036,
          14,
          8
        ),
        goldAntlerMat
      );
      const tine = new THREE.Mesh(
        createSplineTubeGeometry(
          [
            [sx * 0.26, 1.96, -0.52],
            [sx * 0.44, 2.16, -0.62],
          ],
          0.026,
          8,
          6
        ),
        goldAntlerMat
      );
      root.add(mainBranch, tine);
    }

    const sunOrb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 14), goldAntlerMat);
    sunOrb.position.set(0, 2.18, -0.5);
    root.add(sunOrb);

    const legGeo = new THREE.CapsuleGeometry(0.065, 0.58, 6, 10);
    for (const [lx, lz] of [
      [-0.18, -0.38],
      [0.18, -0.38],
      [-0.18, 0.38],
      [0.18, 0.38],
    ]) {
      const leg = new THREE.Mesh(legGeo, stagMat);
      leg.position.set(lx, 0.38, lz);
      root.add(leg);
    }

    root.scale.setScalar(stageScale);
    return root;
  }

  // Default: luminous_oddling (adorable chubby forest sprite with spotted turquoise mushroom cap!)
  const bodyMat = new THREE.MeshToonMaterial({
    map: getCharacterFaceTexture("oddling"),
    gradientMap: gradMap,
  });
  const capMat = new THREE.MeshStandardMaterial({
    color: 0x2dd4bf,
    emissive: 0x0d9488,
    emissiveIntensity: 0.62,
    roughness: 0.26,
  });
  const spotMat = new THREE.MeshBasicMaterial({ color: 0xf0fdfa });

  const body = new THREE.Mesh(
    createLatheProfileGeometry(
      [
        [0.04, 0.0],
        [0.34, 0.06],
        [0.38, 0.28],
        [0.33, 0.58],
        [0.35, 0.78],
        [0.04, 0.94],
      ],
      20
    ),
    bodyMat
  );
  body.rotation.y = Math.PI * 0.5;
  root.add(body);

  const cap = new THREE.Mesh(
    createLatheProfileGeometry(
      [
        [0.04, 1.38],
        [0.32, 1.28],
        [0.62, 1.02],
        [0.68, 0.88],
        [0.32, 0.84],
      ],
      22
    ),
    capMat
  );
  root.add(cap);

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const spot = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), spotMat);
    spot.scale.set(1.2, 0.45, 1.2);
    spot.position.set(Math.cos(a) * 0.42, 1.08, Math.sin(a) * 0.42);
    root.add(spot);
  }

  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.075, 0.18, 6, 10),
      new THREE.MeshToonMaterial({ color: 0xffe8cc, gradientMap: gradMap })
    );
    arm.position.set(sx * 0.38, 0.48, -0.08);
    arm.rotation.z = sx * 0.65;
    root.add(arm);
  }

  root.scale.setScalar(stageScale);
  return root;
}

/* ==================== SCULPTED REALM GUARDIANS ==================== */

export function buildGuardianColossus3D({ realm = "frostwake" } = {}) {
  const gradMap = getCharacterToonGradient();
  const g = new THREE.Group();
  g.name = `sculpted_guardian_${realm}`;

  if (realm === "frostwake") {
    const iceMat = new THREE.MeshStandardMaterial({
      color: 0x67e8f9,
      emissive: 0x0369a1,
      emissiveIntensity: 0.38,
      roughness: 0.2,
      metalness: 0.15,
    });
    const runeMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.95,
      roughness: 0.1,
    });

    // Sculpted glacier torso + broad shoulders + legs
    const torso = new THREE.Mesh(
      createLatheProfileGeometry(
        [
          [0.2, 2.2],
          [1.35, 2.4],
          [1.15, 3.8],
          [2.05, 5.8],
          [1.65, 6.9],
          [0.3, 7.1],
        ],
        12
      ),
      iceMat
    );
    g.add(torso);

    for (const sx of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.62, 1.8, 8, 12), iceMat);
      leg.position.set(sx * 0.95, 1.35, 0);
      const pauldron = new THREE.Mesh(
        createBeveledWingGeometry(
          [
            [0, 0],
            [1.4, 0.9],
            [1.1, 1.8],
            [0.1, 1.1],
          ],
          0.7,
          0.12
        ),
        iceMat
      );
      pauldron.position.set(sx * 1.55, 5.6, -0.35);
      if (sx < 0) pauldron.scale.x = -1;

      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 2.2, 8, 12), iceMat);
      arm.position.set(sx * 2.35, 4.3, -0.2);
      arm.rotation.z = -sx * 0.18;
      g.add(leg, pauldron, arm);
    }

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.95, 16, 14),
      new THREE.MeshToonMaterial({
        map: getCharacterFaceTexture("guardian_ice"),
        gradientMap: gradMap,
      })
    );
    head.rotation.y = Math.PI * 0.5;
    head.position.set(0, 7.85, 0);
    g.add(head);

    for (let i = -1; i <= 1; i++) {
      const crownSpike = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.95, 6), runeMat);
      crownSpike.position.set(i * 0.44, 8.85 + (i === 0 ? 0.22 : 0), 0);
      crownSpike.rotation.z = -i * 0.22;
      g.add(crownSpike);
    }

    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.72, 1), runeMat);
    core.name = "guardian_rune_heart";
    core.position.set(0, 5.2, 1.65);
    g.add(core);
    g.userData.core = core;
    return g;
  }

  if (realm === "arc_bastion") {
    const armorMat = new THREE.MeshToonMaterial({
      map: getCustomSurfaceTexture("sapphire_filigree"),
      gradientMap: gradMap,
    });
    const brassMat = new THREE.MeshToonMaterial({
      map: getCustomSurfaceTexture("bastion_brass_plate"),
      gradientMap: gradMap,
    });
    const haloMat = new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.85,
      roughness: 0.22,
      metalness: 0.65,
    });

    const torso = new THREE.Mesh(
      createLatheProfileGeometry(
        [
          [0.2, 2.2],
          [1.25, 2.3],
          [1.02, 4.0],
          [1.85, 5.9],
          [1.35, 6.9],
          [0.2, 7.0],
        ],
        16
      ),
      armorMat
    );
    g.add(torso);

    for (const sx of [-1, 1]) {
      const greave = new THREE.Mesh(new THREE.CapsuleGeometry(0.52, 1.9, 8, 12), armorMat);
      greave.position.set(sx * 0.85, 1.35, 0);
      const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.92, 16, 12), brassMat);
      pauldron.scale.set(1.15, 0.85, 1.0);
      pauldron.position.set(sx * 1.95, 6.1, 0);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.46, 2.1, 8, 12), armorMat);
      arm.position.set(sx * 2.15, 4.4, 0.15);
      g.add(greave, pauldron, arm);
    }

    // Kite shield on left arm
    const shield = new THREE.Mesh(
      createBeveledWingGeometry(
        [
          [0, -1.6],
          [0.95, -0.4],
          [0.85, 1.1],
          [0, 1.35],
          [-0.85, 1.1],
          [-0.95, -0.4],
        ],
        0.16,
        0.05
      ),
      brassMat
    );
    shield.position.set(-2.45, 4.2, 0.85);
    shield.rotation.y = -0.35;
    g.add(shield);

    const helm = new THREE.Mesh(
      new THREE.SphereGeometry(0.88, 18, 16),
      new THREE.MeshToonMaterial({
        map: getCharacterFaceTexture("guardian_knight"),
        gradientMap: gradMap,
      })
    );
    helm.rotation.y = Math.PI * 0.5;
    helm.position.set(0, 7.8, 0);
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 1.35), brassMat);
    crest.position.set(0, 8.6, 0);
    g.add(helm, crest);

    // Spinning golden Astrolabe Halo behind head
    const halo = new THREE.Group();
    halo.name = "guardian_astrolabe_halo";
    halo.position.set(0, 8.1, -0.75);
    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(1.85, 0.11, 10, 32), haloMat);
    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.07, 10, 28), haloMat);
    halo.add(outerRing, innerRing);
    g.add(halo);
    g.userData.halo = halo;
    return g;
  }

  // oddroot: Carved World-Tree Dryad Spirit face + glowing leaf crown
  const barkMat = new THREE.MeshToonMaterial({
    map: getCharacterFaceTexture("guardian_tree"),
    gradientMap: gradMap,
  });
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x34d399,
    emissive: 0x10b981,
    emissiveIntensity: 0.65,
    roughness: 0.3,
  });
  const faceMask = new THREE.Mesh(new THREE.SphereGeometry(1.15, 20, 16), barkMat);
  faceMask.rotation.y = Math.PI * 0.5;
  faceMask.scale.set(0.95, 1.25, 0.65);
  g.add(faceMask);

  for (let i = 0; i < 7; i++) {
    const a = -0.9 + (i / 6) * 1.8;
    const crownLeaf = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45, 1), leafMat);
    crownLeaf.position.set(Math.sin(a) * 1.25, Math.cos(a) * 1.35 + 0.35, 0.1);
    g.add(crownLeaf);
  }
  return g;
}

/* ==================== SCULPTED OPPOSITION UNIT GEOMETRIES ==================== */

/**
 * Returns organic non-primitive geometries & painted materials for opposition creatures:
 * - Teardrop bouncy slime dome for Frostwake Rime-Creeps
 * - Jellyfish bell dome for Oddroot Gloom-Spore Wisps
 * - Steampunk automaton body for Arc Bastion Clockwork Striders & Gear-Hounds
 */
export function createSlimeDropletGeometry(radius = 0.68) {
  return createLatheProfileGeometry(
    [
      [0.02, 0.0],
      [radius * 1.08, 0.06],
      [radius * 1.02, radius * 0.38],
      [radius * 0.78, radius * 0.85],
      [radius * 0.36, radius * 1.18],
      [0.02, radius * 1.28],
    ],
    16
  );
}

export function createDirigibleHullGeometry(radius = 1.1, halfLen = 2.6) {
  return createLatheProfileGeometry(
    [
      [0.03, -halfLen],
      [radius * 0.52, -halfLen * 0.72],
      [radius * 0.92, -halfLen * 0.32],
      [radius, 0.0],
      [radius * 0.94, halfLen * 0.42],
      [radius * 0.58, halfLen * 0.82],
      [0.04, halfLen],
    ],
    18
  );
}
