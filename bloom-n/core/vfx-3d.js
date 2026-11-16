/**
 * Bloom N Shared 3D Visual Polish, Temple Architecture, Slipstream Boost & Horizon Wonder Kit
 * 100% deterministic, zero external URLs, headless Node-safe (DataTexture RGBA buffers),
 * and 60fps mobile WebGL2 friendly via pooled InstancedMesh & preallocated buffers.
 */

import * as THREE from "../vendor/three.module.min.js";

function clamp(v, lo, hi) {
  if (!Number.isFinite(v)) return lo;
  return v < lo ? lo : v > hi ? hi : v;
}

/**
 * Generates a silky radial glow + 4-point star flare DataTexture (works in both WebGL2 and headless Node).
 */
export function createSoftGlowTexture(
  size = 64,
  innerRgb = [255, 252, 235],
  outerRgb = [94, 242, 200]
) {
  const n = Math.max(16, size | 0);
  const data = new Uint8Array(n * n * 4);
  const half = (n - 1) * 0.5;

  for (let y = 0; y < n; y++) {
    const dy = (y - half) / half;
    for (let x = 0; x < n; x++) {
      const dx = (x - half) / half;
      const r = Math.hypot(dx, dy);
      const idx = (y * n + x) * 4;
      if (r >= 1.0) {
        data[idx + 3] = 0;
        continue;
      }
      const core = Math.pow(Math.max(0, 1 - r), 2.35);
      const flareX = Math.exp(-Math.abs(dy) * 10.5) * Math.pow(Math.max(0, 1 - Math.abs(dx)), 1.9);
      const flareY = Math.exp(-Math.abs(dx) * 10.5) * Math.pow(Math.max(0, 1 - Math.abs(dy)), 1.9);
      const flare = Math.min(1, (flareX + flareY) * 0.52);
      const alpha = clamp(core + flare * 0.65, 0, 1);
      const mix = clamp(core * 1.15, 0, 1);

      data[idx] = Math.round(outerRgb[0] * (1 - mix) + innerRgb[0] * mix);
      data[idx + 1] = Math.round(outerRgb[1] * (1 - mix) + innerRgb[1] * mix);
      data[idx + 2] = Math.round(outerRgb[2] * (1 - mix) + innerRgb[2] * mix);
      data[idx + 3] = Math.round(alpha * 255);
    }
  }

  const tex = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates an ornate concentric sacred temple rune seal DataTexture.
 */
export function createSacredRuneSealTexture(size = 128, theme = "oddroot") {
  const n = Math.max(32, size | 0);
  const data = new Uint8Array(n * n * 4);
  const half = (n - 1) * 0.5;
  const isOddroot = theme === "oddroot";
  const isBastion = theme === "arc_bastion";
  const cMain = isBastion ? [126, 232, 250] : isOddroot ? [94, 242, 200] : [69, 240, 223];
  const cGold = [255, 209, 102];

  for (let y = 0; y < n; y++) {
    const dy = (y - half) / half;
    for (let x = 0; x < n; x++) {
      const dx = (x - half) / half;
      const r = Math.hypot(dx, dy);
      const idx = (y * n + x) * 4;
      if (r > 0.98) {
        data[idx + 3] = 0;
        continue;
      }

      const ang = Math.atan2(dy, dx);
      const outerRing = Math.exp(-Math.pow((r - 0.9) * 34, 2));
      const midRing = Math.exp(-Math.pow((r - 0.68) * 38, 2));
      const innerRing = Math.exp(-Math.pow((r - 0.36) * 36, 2));

      // 8-point sacred star spokes + 24 arcane rune ticks
      const spokes8 =
        r > 0.32 && r < 0.9
          ? Math.pow(Math.max(0, Math.cos(ang * 4)), 26) * 0.72
          : 0;
      const runeTicks =
        r > 0.72 && r < 0.86
          ? Math.pow(Math.max(0, Math.cos(ang * 16)), 10) * 0.82
          : 0;
      const petalArcs =
        r > 0.4 && r < 0.66
          ? Math.exp(-Math.pow((r - (0.52 + 0.1 * Math.cos(ang * 6))) * 28, 2)) * 0.75
          : 0;
      const softFill = Math.max(0, 1 - r) * 0.14;

      const intensity = clamp(
        outerRing + midRing * 0.9 + innerRing * 0.85 + spokes8 + runeTicks + petalArcs + softFill,
        0,
        1
      );
      const goldMix = clamp(runeTicks + petalArcs * 0.7 + innerRing * 0.5, 0, 1);

      data[idx] = Math.round(cMain[0] * (1 - goldMix) + cGold[0] * goldMix);
      data[idx + 1] = Math.round(cMain[1] * (1 - goldMix) + cGold[1] * goldMix);
      data[idx + 2] = Math.round(cMain[2] * (1 - goldMix) + cGold[2] * goldMix);
      data[idx + 3] = Math.round(intensity * 235);
    }
  }

  const tex = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Builds a lush vertex-colored gradient sky-dome + glowing celestial Crescent Moon & Nebula Halo.
 */
export function buildCelestialSkyDome({ theme = "oddroot", radius = 228 } = {}) {
  const group = new THREE.Group();
  group.name = `CelestialSkyDome_${theme}`;

  const domeGeo = new THREE.SphereGeometry(radius, 28, 18);
  const pos = domeGeo.attributes.position;
  const cols = new Float32Array(pos.count * 3);
  const isOddroot = theme === "oddroot";
  const isBastion = theme === "arc_bastion";

  for (let i = 0; i < pos.count; i++) {
    const py = pos.getY(i) / radius; // -1..1
    const px = pos.getX(i) / radius;
    const pz = pos.getZ(i) / radius;
    const t = clamp((py + 0.25) / 1.25, 0, 1);
    const auroraBand = Math.exp(-Math.pow((py - 0.24 - 0.08 * Math.sin(px * 4 + pz * 3)) * 5.2, 2));

    let r;
    let g;
    let b;
    if (isBastion) {
      // Astral clockwork cobalt zenith -> warm brass-sunset & crystal cyan canyon horizon
      r = 0.04 * t + 0.16 * (1 - t) + auroraBand * 0.13;
      g = 0.08 * t + 0.22 * (1 - t) + auroraBand * 0.19;
      b = 0.22 * t + 0.42 * (1 - t) + auroraBand * 0.22;
    } else if (isOddroot) {
      // Deep emerald-indigo zenith -> luminous turquoise-gold twilight horizon
      r = 0.03 * t + 0.09 * (1 - t) + auroraBand * 0.08;
      g = 0.09 * t + 0.26 * (1 - t) + auroraBand * 0.22;
      b = 0.16 * t + 0.29 * (1 - t) + auroraBand * 0.18;
    } else {
      // Polar midnight sapphire zenith -> icy cyan-amber glacial horizon
      r = 0.03 * t + 0.11 * (1 - t) + auroraBand * 0.07;
      g = 0.08 * t + 0.24 * (1 - t) + auroraBand * 0.2;
      b = 0.19 * t + 0.38 * (1 - t) + auroraBand * 0.18;
    }
    cols[i * 3] = clamp(r, 0, 1);
    cols[i * 3 + 1] = clamp(g, 0, 1);
    cols[i * 3 + 2] = clamp(b, 0, 1);
  }
  domeGeo.setAttribute("color", new THREE.BufferAttribute(cols, 3));

  const domeMesh = new THREE.Mesh(
    domeGeo,
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      depthWrite: false,
    })
  );
  group.add(domeMesh);

  // Giant Luminous Sanctuary Moon + Soft Corona in the Northern Twilight Sky
  const moonGroup = new THREE.Group();
  moonGroup.position.set(isBastion ? -32 : isOddroot ? 38 : -44, 74, -148);
  const moonDisc = new THREE.Mesh(
    new THREE.SphereGeometry(9.5, 20, 16),
    new THREE.MeshBasicMaterial({
      color: isBastion ? 0xfff0c8 : isOddroot ? 0xfff6d6 : 0xeef9ff,
      depthWrite: false,
    })
  );
  const glowTex = createSoftGlowTexture(
    64,
    isBastion ? [255, 236, 185] : isOddroot ? [255, 245, 200] : [210, 248, 255],
    isBastion ? [90, 169, 255] : isOddroot ? [94, 242, 200] : [69, 240, 223]
  );
  const corona = new THREE.Mesh(
    new THREE.PlaneGeometry(46, 46),
    new THREE.MeshBasicMaterial({
      map: glowTex,
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  corona.lookAt(0, 4, 0);
  moonGroup.add(corona, moonDisc);
  group.add(moonGroup);

  // Twinkling Soft-Sprite Starfield
  const starCount = 280;
  const starPos = new Float32Array(starCount * 3);
  const starCol = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = (((i * 7919 + 104729) % 100000) / 100000) * Math.PI * 2;
    const phi = (((i * 31337 + 17) % 100000) / 100000) * Math.PI * 0.46;
    const rad = radius * 0.88;
    starPos[i * 3] = Math.cos(theta) * Math.sin(phi) * rad;
    starPos[i * 3 + 1] = Math.cos(phi) * rad + 8;
    starPos[i * 3 + 2] = Math.sin(theta) * Math.sin(phi) * rad;

    const palette = i % 4 === 0 ? [1.0, 0.86, 0.52] : i % 3 === 0 ? [0.45, 0.96, 0.88] : [0.92, 0.98, 1.0];
    starCol[i * 3] = palette[0];
    starCol[i * 3 + 1] = palette[1];
    starCol[i * 3 + 2] = palette[2];
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute("color", new THREE.BufferAttribute(starCol, 3));
  const starMat = new THREE.PointsMaterial({
    size: 3.1,
    map: glowTex,
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const stars = new THREE.Points(starGeo, starMat);
  group.add(stars);

  group.userData = { domeMesh, moonGroup, stars, starMat, glowTex };
  return group;
}

// Cached shared rune textures per theme so building 3 temples allocates zero extra textures
const _cachedRuneTex = {};
function getSharedRuneTexture(theme = "oddroot") {
  if (!_cachedRuneTex[theme]) {
    _cachedRuneTex[theme] = createSacredRuneSealTexture(128, theme);
  }
  return _cachedRuneTex[theme];
}

/**
 * Builds sculpted 3D Temple Architecture around any shrine/gate slot without obstructing central math geometry.
 * Includes stepped temple plinth, rotating sacred rune seal, flanking carved columns with floating braziers,
 * overhead keystone arch, and built-in Awakening Sky-Pillar + Golden Shockwave + Fountain Gems on solve!
 */
export function buildTempleSanctuaryFrame({
  theme = "oddroot",
  archetype = "default",
  accentHex = null,
} = {}) {
  const isOddroot = theme === "oddroot";
  const isBastion = theme === "arc_bastion";
  const group = new THREE.Group();
  group.name = `TempleSanctuaryFrame_${theme}_${archetype}`;

  const baseAccent =
    accentHex ??
    (archetype === "vine" || archetype === "ramp" || archetype === "mortar"
      ? 0xffd166
      : archetype === "astrolabe" || archetype === "moonwell"
      ? 0x7ee8fa
      : isBastion
      ? 0x5aa9ff
      : isOddroot
      ? 0x5ef2c8
      : 0x45f0df);

  const stoneMat = new THREE.MeshStandardMaterial({
    color: isBastion ? 0x222f4d : isOddroot ? 0x23423b : 0x1a314d,
    emissive: isBastion ? 0x0d1730 : isOddroot ? 0x0b221c : 0x0b1a2e,
    emissiveIntensity: 0.32,
    roughness: 0.58,
    metalness: 0.18,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: baseAccent,
    emissive: baseAccent,
    emissiveIntensity: 0.65,
    roughness: 0.25,
    metalness: 0.42,
  });

  // 1. Stepped Octagonal Temple Dais Plinth (sits cleanly at y = 0..0.28)
  const lowerStep = new THREE.Mesh(new THREE.CylinderGeometry(5.3, 5.75, 0.16, 8), stoneMat);
  lowerStep.position.y = 0.08;
  const upperStep = new THREE.Mesh(new THREE.CylinderGeometry(4.45, 4.85, 0.14, 8), stoneMat);
  upperStep.position.y = 0.2;
  const daisTrim = new THREE.Mesh(new THREE.TorusGeometry(4.62, 0.07, 8, 32), trimMat);
  daisTrim.rotation.x = Math.PI / 2;
  daisTrim.position.y = 0.26;
  group.add(lowerStep, upperStep, daisTrim);

  // 2. Rotating Sacred Rune Floor Seal
  const runeMat = new THREE.MeshBasicMaterial({
    map: getSharedRuneTexture(theme),
    color: baseAccent,
    transparent: true,
    opacity: 0.78,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const runeSealMesh = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 8.6), runeMat);
  runeSealMesh.rotation.x = -Math.PI / 2;
  runeSealMesh.position.y = 0.29;
  group.add(runeSealMesh);

  // Approach Carpet / Lantern Stepping Stones leading toward z = +5.8
  for (let s = 0; s < 3; s++) {
    const stepStone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.78 - s * 0.08, 0.9 - s * 0.08, 0.12, 6),
      stoneMat
    );
    stepStone.position.set(0, 0.06, 3.6 + s * 1.15);
    group.add(stepStone);
  }

  // 3. Flanking Temple Pillars / Torii Columns with Floating Brazier Lanterns (x = ±5.15 keeps center 100% open!)
  const brazierFlames = [];
  const columnSpanX = 5.15;
  for (const sx of [-1, 1]) {
    const colGrp = new THREE.Group();
    colGrp.position.set(sx * columnSpanX, 0, 0.45);

    const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.65, 1.15), stoneMat);
    plinth.position.y = 0.32;

    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.48, 5.2, isOddroot ? 7 : 6),
      stoneMat
    );
    shaft.position.y = 3.15;

    // Glowing runeband cuffs around each temple pillar
    const cuffLow = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.055, 8, 18), trimMat);
    cuffLow.rotation.x = Math.PI / 2;
    cuffLow.position.y = 1.65;

    const cuffHigh = new THREE.Mesh(new THREE.TorusGeometry(0.41, 0.055, 8, 18), trimMat);
    cuffHigh.rotation.x = Math.PI / 2;
    cuffHigh.position.y = 4.65;

    const capital = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.42, 0.52, 6), stoneMat);
    capital.position.y = 5.95;

    // Floating Sanctuary Brazier Flame Gem above capital
    const flameMat = new THREE.MeshStandardMaterial({
      color: baseAccent,
      emissive: baseAccent,
      emissiveIntensity: 1.05,
      roughness: 0.15,
    });
    const flameCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.44, 0), flameMat);
    flameCore.position.y = 6.78;

    const flameHalo = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.045, 8, 20),
      trimMat
    );
    flameHalo.position.y = 6.78;

    colGrp.add(plinth, shaft, cuffLow, cuffHigh, capital, flameCore, flameHalo);
    group.add(colGrp);
    brazierFlames.push({ core: flameCore, halo: flameHalo, mat: flameMat, baseY: 6.78, side: sx });
  }

  // 4. Overhead Temple Arch Crown & Floating Keystone
  const archHalfSpan = columnSpanX;
  const archRibbon = new THREE.Mesh(
    new THREE.TorusGeometry(archHalfSpan, 0.13, 8, 32, Math.PI),
    trimMat
  );
  archRibbon.position.set(0, 5.85, 0.45);
  group.add(archRibbon);

  const keystoneMat = new THREE.MeshStandardMaterial({
    color: 0xffefb0,
    emissive: baseAccent,
    emissiveIntensity: 0.95,
    roughness: 0.15,
  });
  const archCrownMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.58, 0), keystoneMat);
  archCrownMesh.position.set(0, 5.85 + archHalfSpan, 0.45);
  group.add(archCrownMesh);

  // 5. Built-in Victory Awakening Sky-Pillar + Dual Shockwave Rings + Rising Gem Fountain (hidden until solved!)
  const clearPillarMat = new THREE.MeshBasicMaterial({
    color: 0xffd166,
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const clearPillarMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 2.85, 36, 18, 1, true),
    clearPillarMat
  );
  clearPillarMesh.position.set(0, 18, 0);
  clearPillarMesh.visible = false;
  group.add(clearPillarMesh);

  const shockwaveMat = new THREE.MeshBasicMaterial({
    color: 0xffd166,
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const shockwaveRing = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.35, 36), shockwaveMat);
  shockwaveRing.rotation.x = -Math.PI / 2;
  shockwaveRing.position.y = 0.36;
  shockwaveRing.visible = false;
  group.add(shockwaveRing);

  const fountainGems = [];
  const gemGeo = new THREE.OctahedronGeometry(0.28, 0);
  const gemMat = new THREE.MeshBasicMaterial({
    color: 0xffe07d,
    transparent: true,
    opacity: 0.95,
  });
  for (let i = 0; i < 10; i++) {
    const gm = new THREE.Mesh(gemGeo, gemMat);
    gm.visible = false;
    group.add(gm);
    fountainGems.push({ mesh: gm, phase: (i / 10) * Math.PI * 2, speed: 3.8 + (i % 3) * 1.1 });
  }

  const state = {
    group,
    runeSealMesh,
    runeMat,
    trimMat,
    keystoneMat,
    brazierFlames,
    archCrownMesh,
    clearPillarMesh,
    clearPillarMat,
    shockwaveRing,
    shockwaveMat,
    fountainGems,
    gemMat,
    awakened: false,
    burstElapsed: 0,
    burstDuration: 2.4,
    setAwakened(isCleared = true, overdrive = false) {
      state.awakened = Boolean(isCleared);
      if (state.awakened) {
        state.burstElapsed = 0.001;
        const goldHex = overdrive ? 0xffe066 : 0xffcf56;
        const glowHex = overdrive ? 0x5ef2c8 : 0xffb703;
        trimMat.color.setHex(goldHex);
        trimMat.emissive.setHex(glowHex);
        trimMat.emissiveIntensity = overdrive ? 1.25 : 0.95;
        runeMat.color.setHex(goldHex);
        runeMat.opacity = 0.95;
        keystoneMat.emissive.setHex(goldHex);
        keystoneMat.emissiveIntensity = 1.4;
        for (const bf of brazierFlames) {
          bf.mat.color.setHex(goldHex);
          bf.mat.emissive.setHex(0xff9f1c);
          bf.mat.emissiveIntensity = 1.5;
          bf.core.scale.setScalar(overdrive ? 1.65 : 1.4);
        }
        clearPillarMat.color.setHex(overdrive ? 0x62f5e4 : 0xffd166);
        clearPillarMesh.visible = true;
        shockwaveMat.color.setHex(goldHex);
        shockwaveRing.visible = true;
        for (const fg of fountainGems) {
          fg.mesh.visible = true;
        }
      }
    },
  };

  group.userData.templeFrame = state;
  return state;
}

/**
 * Steps animations on a TempleSanctuaryFrame (gentle idle breathing + triumphant Awakening Sky-Pillar burst).
 */
export function stepTempleSanctuaryFrame(frame, dt, elapsed) {
  if (!frame || !Number.isFinite(dt)) return;
  const spinRate = frame.awakened ? 0.85 : 0.28;
  frame.runeSealMesh.rotation.z += dt * spinRate;

  const bob = Math.sin(elapsed * 2.8) * 0.14;
  frame.archCrownMesh.rotation.y += dt * (frame.awakened ? 2.4 : 0.9);
  frame.archCrownMesh.position.y = 5.85 + 5.15 + bob;

  for (const bf of frame.brazierFlames) {
    bf.core.rotation.y += dt * (frame.awakened ? 3.2 : 1.5) * bf.side;
    bf.core.position.y = bf.baseY + Math.sin(elapsed * 3.6 + bf.side) * 0.12;
    bf.halo.rotation.x = Math.sin(elapsed * 2.1 + bf.side) * 0.65;
    bf.halo.rotation.y += dt * 1.4;
  }

  if (frame.awakened && frame.burstElapsed > 0 && frame.burstElapsed < frame.burstDuration) {
    frame.burstElapsed += dt;
    const u = clamp(frame.burstElapsed / frame.burstDuration, 0, 1);

    // Sky-pillar flares brightly then settles into a serene golden sanctuary beacon
    const pillarPulse = u < 0.2 ? u / 0.2 : Math.max(0.22, 1 - (u - 0.2) * 0.95);
    frame.clearPillarMat.opacity = pillarPulse * 0.68;
    const widthScale = 0.65 + Math.sin(u * Math.PI) * 0.75;
    frame.clearPillarMesh.scale.set(widthScale, 1, widthScale);

    // Expanding ground shockwave halo
    const ringScale = 1.0 + u * 13.5;
    frame.shockwaveRing.scale.set(ringScale, ringScale, 1);
    frame.shockwaveMat.opacity = Math.pow(1 - u, 1.65) * 0.88;
    if (u >= 0.99) {
      frame.shockwaveRing.visible = false;
    }

    // Spiraling golden fountain gems
    frame.gemMat.opacity = Math.max(0, 1 - u * 1.05);
    for (const fg of frame.fountainGems) {
      const ang = fg.phase + u * 7.5;
      const rad = 1.3 + u * 3.8;
      fg.mesh.position.set(
        Math.cos(ang) * rad,
        0.9 + u * fg.speed * 2.6,
        Math.sin(ang) * rad
      );
      fg.mesh.rotation.x += dt * 5;
      fg.mesh.rotation.y += dt * 6;
      if (u >= 0.98) {
        fg.mesh.visible = false;
      }
    }
  }
}

/**
 * Manages the post-clear Cosmetic & Temporary Speed Boost ("Starlight Slipstream" / "Cryo-Plasma Boost")
 * including twin flowing 3D wingtip/exhaust ribbons, player boost aura shield, starburst halo, and sparkle wake.
 */
export class SlipstreamBoostVFXController {
  constructor({ scene, theme = "oddroot", ribbonSegments = 16 } = {}) {
    this.scene = scene;
    this.theme = theme;
    this.segCount = Math.max(8, ribbonSegments | 0);

    this.remainingSec = 0;
    this.totalDurationSec = 6.0;
    this.speedMultiplier = 1.0;
    this.overdriveActive = false;

    this.root = new THREE.Group();
    this.root.name = `SlipstreamBoostVFX_${theme}`;
    if (this.scene) this.scene.add(this.root);

    const isOddroot = theme === "oddroot";
    const isBastion = theme === "arc_bastion";
    const primaryHex = isBastion ? 0x7ee8fa : isOddroot ? 0x62f5e4 : 0x45f0df;
    const goldHex = 0xffd166;

    // 1. Twin Dynamic 3D Ribbon Trails (left & right wingtip / thruster streamers)
    this.ribbons = [];
    for (let side of [-1, 1]) {
      const vertCount = this.segCount * 2;
      const positions = new Float32Array(vertCount * 3);
      const colors = new Float32Array(vertCount * 3);
      const indices = [];
      for (let i = 0; i < this.segCount - 1; i++) {
        const a = i * 2;
        const b = a + 1;
        const c = a + 2;
        const d = a + 3;
        indices.push(a, b, c, b, d, c);
      }
      for (let i = 0; i < this.segCount; i++) {
        const fade = Math.pow(1 - i / (this.segCount - 1), 1.4);
        const r = (1.0 * (1 - i / this.segCount) + 0.35 * (i / this.segCount)) * fade;
        const g = (0.86 * (1 - i / this.segCount) + 0.96 * (i / this.segCount)) * fade;
        const bCol = (0.42 * (1 - i / this.segCount) + 0.88 * (i / this.segCount)) * fade;
        for (let k = 0; k < 2; k++) {
          const vi = (i * 2 + k) * 3;
          colors[vi] = r;
          colors[vi + 1] = g;
          colors[vi + 2] = bCol;
        }
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      geo.setIndex(indices);

      const mat = new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;
      mesh.visible = false;
      this.root.add(mesh);

      const history = Array.from({ length: this.segCount }, () => ({
        x: 0,
        y: -50,
        z: 0,
        nx: 1,
        nz: 0,
      }));
      this.ribbons.push({ side, geo, mat, mesh, history, initialized: false });
    }

    // 2. Player Boost Shield Aura Torus + Wind Cone
    this.auraMat = new THREE.MeshBasicMaterial({
      color: primaryHex,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.auraGroup = new THREE.Group();
    const slipCone = new THREE.Mesh(
      new THREE.ConeGeometry(1.55, 3.2, 16, 1, true),
      this.auraMat
    );
    slipCone.rotation.x = -Math.PI / 2;
    slipCone.position.set(0, 1.1, -0.5);
    const orbitHalo = new THREE.Mesh(
      new THREE.TorusGeometry(1.45, 0.065, 8, 28),
      new THREE.MeshBasicMaterial({
        color: goldHex,
        transparent: true,
        opacity: 0.82,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    orbitHalo.rotation.x = Math.PI / 2;
    orbitHalo.position.y = 0.9;
    this.orbitHalo = orbitHalo;
    this.auraGroup.add(slipCone, orbitHalo);
    this.auraGroup.visible = false;
    this.root.add(this.auraGroup);

    // 3. Pooled Sparkle Wake & Solve Burst Gems (36 instanced octahedrons)
    this.sparkCount = 36;
    const sparkGeo = new THREE.OctahedronGeometry(0.22, 0);
    const sparkMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.sparkInst = new THREE.InstancedMesh(sparkGeo, sparkMat, this.sparkCount);
    this.sparkInst.frustumCulled = false;
    this.root.add(this.sparkInst);

    this._tmpObj = new THREE.Object3D();
    const cGold = new THREE.Color(goldHex);
    const cCyan = new THREE.Color(primaryHex);
    this.sparks = [];
    for (let i = 0; i < this.sparkCount; i++) {
      this._tmpObj.position.set(0, -60, 0);
      this._tmpObj.scale.setScalar(0.001);
      this._tmpObj.updateMatrix();
      this.sparkInst.setMatrixAt(i, this._tmpObj.matrix);
      this.sparkInst.setColorAt(i, i % 2 === 0 ? cGold : cCyan);
      this.sparks.push({
        active: false,
        x: 0,
        y: -60,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.7,
      });
    }
    this.sparkInst.instanceMatrix.needsUpdate = true;
    if (this.sparkInst.instanceColor) this.sparkInst.instanceColor.needsUpdate = true;
    this._emitAccum = 0;
  }

  triggerClearBoost({ x = 0, y = 0, z = 0, overdrive = false } = {}) {
    this.overdriveActive = Boolean(overdrive);
    this.totalDurationSec = this.overdriveActive ? 7.5 : 5.5;
    this.remainingSec = this.totalDurationSec;
    this.speedMultiplier = this.overdriveActive ? 1.46 : 1.35;

    // Reset ribbon history cleanly to current position so no teleport streaks appear
    for (const r of this.ribbons) {
      r.initialized = false;
    }

    // Spawn 20 celebratory starburst gems around the player!
    let spawned = 0;
    for (let i = 0; i < this.sparks.length && spawned < 20; i++) {
      const sp = this.sparks[i];
      const ang = (spawned / 20) * Math.PI * 2;
      const spd = 3.2 + (spawned % 4) * 1.1;
      sp.active = true;
      sp.x = x + Math.cos(ang) * 0.6;
      sp.y = y + 0.9;
      sp.z = z + Math.sin(ang) * 0.6;
      sp.vx = Math.cos(ang) * spd;
      sp.vy = 3.6 + (spawned % 3) * 1.3;
      sp.vz = Math.sin(ang) * spd;
      sp.maxLife = 0.85;
      sp.life = sp.maxLife;
      spawned++;
    }
  }

  isActive() {
    return this.remainingSec > 0.01;
  }

  getSpeedMultiplier() {
    return this.remainingSec > 0.01 ? this.speedMultiplier : 1.0;
  }

  getRemainingRatio() {
    if (this.remainingSec <= 0 || this.totalDurationSec <= 0) return 0;
    return clamp(this.remainingSec / this.totalDurationSec, 0, 1);
  }

  step(dt, elapsed, pose = {}) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    const px = Number.isFinite(pose.x) ? pose.x : 0;
    const py = Number.isFinite(pose.y) ? pose.y : 0;
    const pz = Number.isFinite(pose.z) ? pose.z : 0;
    const heading = Number.isFinite(pose.heading) ? pose.heading : 0;
    const speed = Math.abs(Number(pose.speed) || 0);
    const manualBoost = Boolean(pose.boosting) || Boolean(pose.inSurge);

    if (this.remainingSec > 0) {
      this.remainingSec = Math.max(0, this.remainingSec - dt);
      if (this.remainingSec <= 0) {
        this.speedMultiplier = 1.0;
        this.overdriveActive = false;
      }
    }

    const showTrails = this.remainingSec > 0.01 || manualBoost || speed > 11.5;
    const wingSpan = Number.isFinite(pose.wingSpan) ? pose.wingSpan : 1.25;
    const rightX = Math.cos(heading);
    const rightZ = -Math.sin(heading);

    // Update Boost Shield Aura
    if (this.remainingSec > 0.01 || manualBoost) {
      const fade = this.remainingSec > 0.01 ? Math.min(1, this.remainingSec * 1.2) : 0.65;
      this.auraGroup.visible = true;
      this.auraGroup.position.set(px, py, pz);
      this.auraGroup.rotation.y = heading;
      this.auraMat.opacity = (0.24 + 0.08 * Math.sin(elapsed * 9.0)) * fade;
      this.orbitHalo.rotation.z = elapsed * 4.5;
      this.orbitHalo.scale.setScalar(1.0 + 0.08 * Math.sin(elapsed * 7.0));
    } else {
      this.auraGroup.visible = false;
    }

    // Update Twin 3D Wingtip / Exhaust Ribbons
    for (const r of this.ribbons) {
      if (!showTrails) {
        r.mesh.visible = false;
        r.initialized = false;
        continue;
      }
      const anchorX = px + rightX * r.side * wingSpan;
      const anchorY = py + 1.05 + Math.sin(elapsed * 6 + r.side) * 0.08;
      const anchorZ = pz + rightZ * r.side * wingSpan;

      if (!r.initialized) {
        for (let i = 0; i < this.segCount; i++) {
          r.history[i].x = anchorX;
          r.history[i].y = anchorY;
          r.history[i].z = anchorZ;
          r.history[i].nx = rightX;
          r.history[i].nz = rightZ;
        }
        r.initialized = true;
      } else {
        for (let i = this.segCount - 1; i > 0; i--) {
          r.history[i].x = r.history[i - 1].x;
          r.history[i].y = r.history[i - 1].y;
          r.history[i].z = r.history[i - 1].z;
          r.history[i].nx = r.history[i - 1].nx;
          r.history[i].nz = r.history[i - 1].nz;
        }
        r.history[0].x = anchorX;
        r.history[0].y = anchorY;
        r.history[0].z = anchorZ;
        r.history[0].nx = rightX;
        r.history[0].nz = rightZ;
      }

      const posAttr = r.geo.attributes.position;
      const baseHalfWidth = this.remainingSec > 0.01 ? 0.24 : 0.14;
      for (let i = 0; i < this.segCount; i++) {
        const pt = r.history[i];
        const w = baseHalfWidth * (1 - i / this.segCount);
        posAttr.setXYZ(i * 2, pt.x - pt.nx * w, pt.y + w * 0.35, pt.z - pt.nz * w);
        posAttr.setXYZ(i * 2 + 1, pt.x + pt.nx * w, pt.y - w * 0.35, pt.z + pt.nz * w);
      }
      posAttr.needsUpdate = true;
      r.mat.opacity = this.remainingSec > 0.01 ? 0.78 : 0.42;
      r.mesh.visible = true;
    }

    // Continuous sparkle trail emission while slipstream boost is active
    if (this.remainingSec > 0.01 && speed > 1.5) {
      this._emitAccum += dt * 18;
      while (this._emitAccum >= 1) {
        this._emitAccum -= 1;
        const free = this.sparks.find((s) => !s.active);
        if (!free) break;
        const jitter = ((Math.sin(elapsed * 43.7 + free.x) + 1) * 0.5 - 0.5) * 1.8;
        free.active = true;
        free.x = px + rightX * jitter;
        free.y = py + 0.75;
        free.z = pz + rightZ * jitter;
        free.vx = rightX * jitter * 0.8;
        free.vy = 1.4;
        free.vz = rightZ * jitter * 0.8;
        free.maxLife = 0.52;
        free.life = 0.52;
      }
    }

    // Step active instanced sparkle gems
    let dirty = false;
    for (let i = 0; i < this.sparks.length; i++) {
      const sp = this.sparks[i];
      if (!sp.active) continue;
      dirty = true;
      sp.life -= dt;
      if (sp.life <= 0) {
        sp.active = false;
        this._tmpObj.position.set(0, -60, 0);
        this._tmpObj.scale.setScalar(0.001);
        this._tmpObj.updateMatrix();
        this.sparkInst.setMatrixAt(i, this._tmpObj.matrix);
        continue;
      }
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.z += sp.vz * dt;
      sp.vy -= 4.8 * dt;
      const s = clamp((sp.life / sp.maxLife) * 1.35, 0.05, 1.5);
      this._tmpObj.position.set(sp.x, sp.y, sp.z);
      this._tmpObj.rotation.set(elapsed * 4 + i, elapsed * 5 + i, 0);
      this._tmpObj.scale.setScalar(s);
      this._tmpObj.updateMatrix();
      this.sparkInst.setMatrixAt(i, this._tmpObj.matrix);
    }
    if (dirty) {
      this.sparkInst.instanceMatrix.needsUpdate = true;
    }
  }
}

/**
 * Keeps kids wondering what is next in 3D:
 * 1) Distant Northern Astral Mystery Arch with 8 progressive Rune Segments lighting up toward next Rank!
 * 2) Every 3rd temple clear drops a glowing Golden Shooting-Star Relic (+8💎) nearby to discover!
 */
export class HorizonWonderAndRelicSystem {
  constructor({
    scene,
    theme = "oddroot",
    archPosition = { x: 0, y: 8.5, z: -52 },
  } = {}) {
    this.scene = scene;
    this.theme = theme;
    this.clearsCount = 0;
    this.zoneRatio = 0.25;

    this.root = new THREE.Group();
    this.root.name = `HorizonWonderSystem_${theme}`;
    if (this.scene) this.scene.add(this.root);

    // 1. Distant Horizon Astral Mystery Portal Arch
    this.archGroup = new THREE.Group();
    this.archGroup.position.set(archPosition.x, archPosition.y, archPosition.z);

    const frameMat = new THREE.MeshStandardMaterial({
      color: theme === "oddroot" ? 0x26544c : 0x1e3f66,
      emissive: theme === "oddroot" ? 0x11362f : 0x0d2340,
      emissiveIntensity: 0.45,
      roughness: 0.35,
      metalness: 0.4,
    });
    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(6.4, 0.36, 10, 40), frameMat);
    this.archGroup.add(outerRing);

    this.portalVeilMat = new THREE.MeshBasicMaterial({
      map: getSharedRuneTexture(theme),
      color: 0x5ef2c8,
      transparent: true,
      opacity: 0.26,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.portalVeil = new THREE.Mesh(new THREE.CircleGeometry(6.1, 36), this.portalVeilMat);
    this.archGroup.add(this.portalVeil);

    this.runeNodes = [];
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const rMat = new THREE.MeshStandardMaterial({
        color: 0x335c67,
        emissive: 0x102a36,
        emissiveIntensity: 0.2,
        roughness: 0.2,
      });
      const rGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), rMat);
      rGem.position.set(Math.cos(ang) * 6.4, Math.sin(ang) * 6.4, 0);
      this.archGroup.add(rGem);
      this.runeNodes.push({ mesh: rGem, mat: rMat, index: i });
    }
    this.root.add(this.archGroup);

    // 2. Surprise Golden Shooting-Star Relic Drop
    this.relic = {
      active: false,
      x: 0,
      y: -50,
      z: 0,
      group: new THREE.Group(),
    };
    const relicGoldMat = new THREE.MeshStandardMaterial({
      color: 0xffe066,
      emissive: 0xff9f1c,
      emissiveIntensity: 1.15,
      roughness: 0.15,
      metalness: 0.45,
    });
    const relicCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.78, 0), relicGoldMat);
    relicCore.position.y = 1.45;
    const relicHalo = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.08, 8, 28), relicGoldMat);
    relicHalo.rotation.x = Math.PI / 2;
    relicHalo.position.y = 1.45;
    const relicBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.85, 22, 14, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xffe066,
        transparent: true,
        opacity: 0.34,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    relicBeam.position.y = 11.0;
    this.relic.core = relicCore;
    this.relic.halo = relicHalo;
    this.relic.group.add(relicCore, relicHalo, relicBeam);
    this.relic.group.visible = false;
    this.root.add(this.relic.group);

    this.setZoneProgress(0.25);
  }

  setZoneProgress(ratio = 0.25) {
    const r = clamp(ratio, 0, 1);
    this.zoneRatio = r;
    const litCount = Math.max(1, Math.round(r * 8));
    for (const node of this.runeNodes) {
      const lit = node.index < litCount;
      node.mat.color.setHex(lit ? 0xffd166 : 0x335c67);
      node.mat.emissive.setHex(lit ? 0x5ef2c8 : 0x102a36);
      node.mat.emissiveIntensity = lit ? 1.15 : 0.18;
    }
    this.portalVeilMat.opacity = 0.18 + r * 0.45;
    this.portalVeilMat.color.setHex(r >= 0.99 ? 0xffd166 : 0x5ef2c8);
  }

  notifyTempleCleared({ dropX = 0, dropY = 0, dropZ = 0 } = {}) {
    this.clearsCount += 1;
    // Every 3rd solve drops a surprise Shooting-Star Relic in open sight ahead!
    if (this.clearsCount % 3 === 0 && !this.relic.active) {
      this.spawnShootingStarRelic(dropX, dropY, dropZ);
      return { spawnedRelic: true };
    }
    return { spawnedRelic: false };
  }

  spawnShootingStarRelic(x = 0, y = 0, z = 0) {
    this.relic.active = true;
    this.relic.x = x;
    this.relic.y = y;
    this.relic.z = z;
    this.relic.group.position.set(x, y, z);
    this.relic.group.visible = true;
  }

  step(dt, elapsed, playerPos = null, onRelicCollected = null) {
    if (!Number.isFinite(dt)) return;
    this.portalVeil.rotation.z -= dt * (0.35 + this.zoneRatio * 0.75);
    for (const node of this.runeNodes) {
      node.mesh.rotation.x += dt * 1.4;
      node.mesh.rotation.y += dt * 1.8;
    }

    if (this.relic.active) {
      this.relic.core.rotation.y += dt * 2.8;
      this.relic.core.position.y = 1.45 + Math.sin(elapsed * 3.8) * 0.28;
      this.relic.halo.rotation.z = elapsed * 2.2;

      if (playerPos && Number.isFinite(playerPos.x) && Number.isFinite(playerPos.z)) {
        const dist = Math.hypot(playerPos.x - this.relic.x, playerPos.z - this.relic.z);
        if (dist < 3.4) {
          this.relic.active = false;
          this.relic.group.visible = false;
          if (typeof onRelicCollected === "function") {
            onRelicCollected({
              kind: "shooting_star_relic",
              shardsEarned: 8,
              message: "🌠 Shooting-Star Relic Found! +8💎",
              x: this.relic.x,
              y: this.relic.y,
              z: this.relic.z,
            });
          }
        }
      }
    }
  }
}
