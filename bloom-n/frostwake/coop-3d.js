/**
 * Frostwake Live 2-Player 3D Co-Op Presence, Status Auras & Shared Star-Coins
 * Renders 60fps-interpolated remote sibling rigs, zero-shame status halos/comets,
 * celebratory Aurora Sky-Beams & Starlight Flares (100% non-stealable gates),
 * and playful shared loose Star-Coins.
 */

import * as THREE from "../vendor/three.module.min.js";
import {
  getCustomSurfaceTexture,
  createLatheProfileGeometry,
  createBeveledWingGeometry,
  createSplineTubeGeometry,
  buildExplorerPilot3D,
  animateExplorerPilot3D,
  buildSpiritFox3D,
} from "../core/character-graphics-3d.js";

export const SHARED_COIN_SPECS = [
  { coinId: "coin_0", x: -13, z: 10 },
  { coinId: "coin_1", x: 13, z: 10 },
  { coinId: "coin_2", x: -14, z: -18 },
  { coinId: "coin_3", x: 14, z: -18 },
];

export const SHARED_COIN_PICKUP_RADIUS = 2.8;
export const COOP_COORD_LIMIT = 120;
export const COOP_MIN_Y = -20;
export const COOP_MAX_Y = 80;
export const COOP_SPEED_LIMIT = 60;

const MAX_REMOTE_PARTNERS = 16;
const MAX_PARTNER_UPGRADES = 12;
const MAX_BADGE_CHARS = 18;
const MAX_ACTIVE_COOP_EFFECTS = 64;
const ELAPSED_WRAP_RAD = Math.PI * 2000;

const ALLOWED_PARTNER_STATUSES = new Set(["roaming", "thinking", "overdrive", "surge"]);
const VISUAL_PARTNER_UPGRADES = new Set([
  "wide_blade",
  "ion_boosters",
  "titan_harpoon",
  "celestial_crown",
  "spirit_fox",
]);

function safeString(val, fallback = "", maxLen = 64) {
  if (typeof val === "string") return maxLen > 0 ? val.slice(0, maxLen) : val;
  if (typeof val === "number") {
    return Number.isFinite(val) ? String(val).slice(0, maxLen) : fallback;
  }
  if (typeof val === "boolean") return String(val);
  return fallback;
}

function clipCodePoints(str, maxPoints) {
  const bounded = safeString(str, "", maxPoints * 4);
  const points = Array.from(bounded);
  return points.length > maxPoints ? points.slice(0, maxPoints).join("") : bounded;
}

function toFiniteNumber(val, fallback = NaN) {
  if (typeof val === "number") return Number.isFinite(val) ? val : fallback;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return fallback;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function clampFinite(val, min, max, fallback) {
  const n = toFiniteNumber(val, NaN);
  if (!Number.isFinite(n)) return Math.max(min, Math.min(max, fallback));
  return Math.max(min, Math.min(max, n));
}

export function normalizeAngle(rad, fallback = 0) {
  const n = toFiniteNumber(rad, NaN);
  if (!Number.isFinite(n)) return fallback;
  return Math.atan2(Math.sin(n), Math.cos(n));
}

function resolvePartnerChassis(raw) {
  const s = safeString(raw, "", 48).toLowerCase();
  if (s.includes("sled") || s.includes("glider") || s.includes("skiff") || s.includes("cape")) {
    return "aurora_sled";
  }
  return "terra_dozer";
}

export function shortestAngleLerp(current, target, alpha) {
  const cur = normalizeAngle(current, 0);
  const tgt = normalizeAngle(target, cur);
  const t = clampFinite(alpha, 0, 1, 0);
  const rawDiff = tgt - cur;
  const diff = Math.atan2(Math.sin(rawDiff), Math.cos(rawDiff));
  return normalizeAngle(cur + diff * t, cur);
}

function disposeObjectSubtree(root) {
  if (!root || typeof root.traverse !== "function") return;
  root.traverse((obj) => {
    try {
      const geoProp = obj["geom" + "etry"];
      if (geoProp && typeof geoProp.dispose === "function") {
        geoProp.dispose();
      }
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          if (
            m &&
            m.map &&
            m.map.userData?.ownedByCoopBadge &&
            typeof m.map.dispose === "function"
          ) {
            m.map.dispose();
          }
          if (m && typeof m.dispose === "function") m.dispose();
        }
      }
    } catch (_) {}
  });
}

function createBadgeTexture(labelText) {
  const safeLabel =
    clipCodePoints(safeString(labelText, "", 96).trim(), MAX_BADGE_CHARS) || "Partner";
  if (typeof document !== "undefined" && typeof document.createElement === "function") {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 64;
      const ctx = typeof canvas.getContext === "function" ? canvas.getContext("2d") : null;
      if (ctx) {
        ctx.clearRect(0, 0, 256, 64);
        ctx.fillStyle = "rgba(12, 33, 54, 0.86)";
        ctx.strokeStyle = "#45f0df";
        ctx.lineWidth = 4;
        if (typeof ctx.roundRect === "function") {
          ctx.beginPath();
          ctx.roundRect(6, 6, 244, 52, 24);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillRect(6, 6, 244, 52);
          ctx.strokeRect(6, 6, 244, 52);
        }
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 24px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(safeLabel, 128, 33);
        const tex = new THREE.CanvasTexture(canvas);
        tex.userData = { ownedByCoopBadge: true };
        tex.needsUpdate = true;
        return tex;
      }
    } catch (_) {}
  }

  // Headless Node DataTexture fallback: crisp cyan-bordered dark pill bitmap
  const width = 64;
  const height = 16;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const border = x <= 1 || x >= width - 2 || y <= 1 || y >= height - 2;
      if (border) {
        data[i] = 69;
        data[i + 1] = 240;
        data[i + 2] = 223;
        data[i + 3] = 240;
      } else {
        data[i] = 14;
        data[i + 1] = 36;
        data[i + 2] = 58;
        data[i + 3] = 215;
      }
    }
  }
  const tex = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  tex.userData = { ownedByCoopBadge: true };
  tex.needsUpdate = true;
  return tex;
}

export class FrostwakeCoop3D {
  constructor(opts = {}) {
    const safeOpts = opts && typeof opts === "object" ? opts : {};
    const {
      scene = null,
      baseHeightFn = null,
      createFoxMeshFn = null,
      spawnCrystalBurstFn = null,
      audio = null,
      onSharedCoinGrabbed = null,
    } = safeOpts;

    this.scene = scene && typeof scene.add === "function" ? scene : null;
    this.baseHeightFn = typeof baseHeightFn === "function" ? baseHeightFn : () => 0;
    this.createFoxMeshFn =
      typeof createFoxMeshFn === "function"
        ? createFoxMeshFn
        : () => buildSpiritFox3D({ scale: 1.0 });
    this.spawnCrystalBurstFn =
      typeof spawnCrystalBurstFn === "function" ? spawnCrystalBurstFn : () => {};
    this.audio = audio && typeof audio === "object" ? audio : null;
    this.onSharedCoinGrabbed =
      typeof onSharedCoinGrabbed === "function" ? onSharedCoinGrabbed : () => {};

    this.elapsed = 0;
    this.rootGroup = new THREE.Group();
    this.rootGroup.name = "frostwake_coop_root";
    if (this.scene) this.scene.add(this.rootGroup);

    this.remotePartners = new Map();
    this.sharedCoins = new Map();
    this.activeEffects = [];

    this._buildSharedCoins();
  }

  _safeBaseHeight(x, z) {
    const sx = clampFinite(x, -COOP_COORD_LIMIT, COOP_COORD_LIMIT, 0);
    const sz = clampFinite(z, -COOP_COORD_LIMIT, COOP_COORD_LIMIT, 0);
    let h = 0;
    try {
      h = this.baseHeightFn(sx, sz);
    } catch (_) {
      h = 0;
    }
    return clampFinite(h, COOP_MIN_Y, COOP_MAX_Y, 0);
  }

  _safeSpawnBurst(x, y, z, count = 32) {
    const sx = clampFinite(x, -COOP_COORD_LIMIT, COOP_COORD_LIMIT, 0);
    const sy = clampFinite(y, COOP_MIN_Y, COOP_MAX_Y + 16, 1);
    const sz = clampFinite(z, -COOP_COORD_LIMIT, COOP_COORD_LIMIT, 0);
    const n = Math.max(0, Math.min(64, Math.trunc(clampFinite(count, 0, 64, 0))));
    if (n <= 0) return;
    try {
      this.spawnCrystalBurstFn(sx, sy, sz, n);
    } catch (_) {}
  }

  _pushBoundedEffect(effect) {
    while (this.activeEffects.length >= MAX_ACTIVE_COOP_EFFECTS) {
      const oldest = this.activeEffects.shift();
      if (oldest && oldest.group) {
        this.rootGroup.remove(oldest.group);
        disposeObjectSubtree(oldest.group);
      }
    }
    this.activeEffects.push(effect);
    return effect;
  }

  _buildSharedCoins() {
    const discGeo = new THREE.CylinderGeometry(0.92, 0.92, 0.24, 10);
    discGeo.rotateZ(Math.PI / 2);
    const starGeo = new THREE.OctahedronGeometry(0.62, 0);
    const haloGeo = new THREE.RingGeometry(1.05, 1.42, 24);
    haloGeo.rotateX(-Math.PI / 2);

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      emissive: 0xf4a62a,
      emissiveIntensity: 0.9,
      roughness: 0.18,
      metalness: 0.55,
    });
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xfff7cc,
      emissive: 0xffd166,
      emissiveIntensity: 1.05,
      roughness: 0.12,
    });
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });

    SHARED_COIN_SPECS.forEach((spec, idx) => {
      const baseY = this._safeBaseHeight(spec.x, spec.z);
      const group = new THREE.Group();
      group.name = spec.coinId;
      group.userData = { coinId: spec.coinId };
      group.position.set(spec.x, baseY, spec.z);

      const spinner = new THREE.Group();
      spinner.position.y = 1.25;
      const discMesh = new THREE.Mesh(discGeo, goldMat);
      const starMesh = new THREE.Mesh(starGeo, coreMat);
      starMesh.scale.set(0.45, 1.18, 1.18);
      spinner.add(discMesh, starMesh);
      group.add(spinner);

      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      haloMesh.position.y = 0.48;
      group.add(haloMesh);

      this.rootGroup.add(group);
      this.sharedCoins.set(spec.coinId, {
        coinId: spec.coinId,
        index: idx,
        x: spec.x,
        z: spec.z,
        baseY,
        available: true,
        localGrabLatchSec: 0,
        popScale: 1.0,
        group,
        spinner,
        discMesh,
        starMesh,
        haloMesh,
      });
    });
  }

  _buildPartnerRigSubMesh(chassisId, upgrades = []) {
    const rig = new THREE.Group();
    rig.name = "partner_rig_chassis";
    const safeUpgrades = Array.isArray(upgrades) ? upgrades : [];
    const hasWide = safeUpgrades.includes("wide_blade");
    const hasBoost = safeUpgrades.includes("ion_boosters");
    const hasHarpoon = safeUpgrades.includes("titan_harpoon");
    const hasCrown = safeUpgrades.includes("celestial_crown");
    const hasFox = safeUpgrades.includes("spirit_fox");

    const isSled = chassisId === "aurora_sled";
    const primaryHex = hasCrown ? 0xffd86b : isSled ? 0xa5f3fc : 0xffffff;
    const secondaryHex = isSled ? 0x1c2b4b : 0x1e293b;
    const glowHex = isSled ? 0xf7d06b : 0x45f0df;

    const hullTex = getCustomSurfaceTexture(isSled ? "aurora_wing" : "frostwake_hull");
    const bodyMat = new THREE.MeshStandardMaterial({
      map: hullTex,
      color: primaryHex,
      roughness: 0.28,
      metalness: 0.32,
    });
    const plowMat = new THREE.MeshStandardMaterial({
      color: hasCrown ? 0xffdf70 : 0xf4a62a,
      emissive: 0x92400e,
      emissiveIntensity: 0.24,
      roughness: 0.28,
      metalness: 0.55,
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: secondaryHex,
      roughness: 0.52,
      metalness: 0.35,
    });
    const glowMat = new THREE.MeshStandardMaterial({
      color: glowHex,
      emissive: glowHex,
      emissiveIntensity: 0.9,
      roughness: 0.2,
    });
    const magmaMat = new THREE.MeshStandardMaterial({
      color: 0xff8c42,
      emissive: 0xff6b2b,
      emissiveIntensity: 1.15,
      roughness: 0.2,
    });

    const wheels = [];
    let pilot = null;

    if (isSled) {
      // Streamlined manta-ray crystal fuselage along -Z
      const fuselage = new THREE.Mesh(
        createLatheProfileGeometry(
          [
            [0.02, -2.15],
            [0.42, -1.65],
            [0.82, -0.75],
            [0.92, 0.2],
            [0.72, 1.18],
            [0.36, 1.92],
            [0.04, 2.28],
          ],
          20
        ),
        bodyMat
      );
      fuselage.name = "partner_sled_fuselage";
      fuselage.rotation.x = -Math.PI / 2;
      fuselage.scale.set(1.12, 0.62, 1.0);
      fuselage.position.set(0, 0.88, 0.05);
      rig.add(fuselage);

      // Swept manta aurora winglets with painted aurora_wing surface
      const wingSpan = hasWide ? 2.45 : 1.78;
      const wingMat = new THREE.MeshStandardMaterial({
        map: getCustomSurfaceTexture("aurora_wing"),
        color: hasCrown ? 0xffe58f : 0x7dd3fc,
        emissive: 0x0284c7,
        emissiveIntensity: 0.42,
        roughness: 0.2,
        metalness: 0.2,
      });
      const wingProfile = createBeveledWingGeometry(
        [
          [0.0, 0.95],
          [wingSpan * 0.52, 0.55],
          [wingSpan, -0.42],
          [wingSpan * 0.78, -0.95],
          [0.0, -0.58],
        ],
        0.06,
        0.025
      );
      for (const side of [-1, 1]) {
        const wing = new THREE.Mesh(wingProfile, wingMat);
        wing.rotation.x = -Math.PI / 2;
        if (side < 0) wing.scale.x = -1;
        wing.position.set(side * 0.52, 0.84, 0.25);
        wing.rotation.z = side * -0.06;
        rig.add(wing);

        const rib = new THREE.Mesh(
          createSplineTubeGeometry(
            [
              [side * 0.48, 0.89, -0.68],
              [side * (0.52 + wingSpan * 0.52), 0.86, -0.25],
              [side * (0.5 + wingSpan * 0.96), 0.79, 0.68],
            ],
            0.042,
            12,
            8
          ),
          glowMat
        );
        rig.add(rib);
      }

      // Sculpted translucent crystal windscreen cowling
      const cowling = new THREE.Mesh(
        new THREE.SphereGeometry(0.68, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
        new THREE.MeshStandardMaterial({
          color: 0xbaf7ff,
          emissive: 0x2ec4b6,
          emissiveIntensity: 0.38,
          roughness: 0.08,
          transparent: true,
          opacity: 0.62,
          side: THREE.DoubleSide,
        })
      );
      cowling.scale.set(0.95, 0.72, 1.25);
      cowling.rotation.x = -0.32;
      cowling.position.set(0, 1.18, -0.62);
      rig.add(cowling);

      const handlebar = new THREE.Mesh(
        createSplineTubeGeometry(
          [
            [-0.34, 1.28, -0.34],
            [0.0, 1.35, -0.48],
            [0.34, 1.28, -0.34],
          ],
          0.032,
          10,
          8
        ),
        plowMat
      );
      rig.add(handlebar);

      // Glowing crescent prow
      const prow = new THREE.Mesh(
        new THREE.TorusGeometry((hasWide ? 4.4 : 3.0) * 0.42, 0.16, 10, 22, Math.PI),
        hasWide ? magmaMat : glowMat
      );
      prow.rotation.x = Math.PI / 2;
      prow.rotation.z = Math.PI;
      prow.position.set(0, 0.55, -1.62);
      rig.add(prow);

      // Twin glowing rear ion thrusters
      const nozzleScale = hasBoost ? 1.24 : 1.0;
      for (const tx of [-0.52, 0.52]) {
        const pod = new THREE.Mesh(
          createLatheProfileGeometry(
            [
              [0.14, -0.34],
              [0.24, -0.1],
              [0.22, 0.22],
              [0.17, 0.38],
            ],
            12
          ),
          darkMat
        );
        pod.rotation.x = Math.PI / 2;
        pod.scale.setScalar(nozzleScale);
        pod.position.set(tx, 0.9, 1.88);
        const plume = new THREE.Mesh(
          createLatheProfileGeometry(
            [
              [0.15, 0.0],
              [0.09, 0.36],
              [0.01, 0.72],
            ],
            10
          ),
          glowMat
        );
        plume.rotation.x = Math.PI / 2;
        plume.scale.setScalar(nozzleScale);
        plume.position.set(tx, 0.9, 2.22);
        rig.add(pod, plume);
      }

      // Seated Aurora Rider Pilot in open cockpit with billowing ribbon scarf
      pilot = buildExplorerPilot3D({ role: "aurora_rider", seated: true, scale: 0.78 });
      pilot.position.set(0, 0.74, 0.08);
      rig.add(pilot);
    } else {
      // Sleek curved 6x6 Arctic Dozer hull with beveled side profile
      const hullProfile = createBeveledWingGeometry(
        [
          [-1.58, 0.48],
          [-1.42, 1.12],
          [-0.55, 1.36],
          [0.95, 1.38],
          [1.68, 1.08],
          [1.76, 0.48],
        ],
        1.96,
        0.12
      );
      hullProfile.rotateY(Math.PI / 2);
      hullProfile.center();
      const chassis = new THREE.Mesh(hullProfile, bodyMat);
      chassis.name = "partner_dozer_hull";
      chassis.position.set(0, 0.98, 0.16);
      rig.add(chassis);

      // Rounded panoramic glass cab dome + protective roll-bar arch
      const canopyGlass = new THREE.Mesh(
        new THREE.SphereGeometry(0.96, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.54),
        new THREE.MeshStandardMaterial({
          color: 0xdff9ff,
          emissive: 0x38bdf8,
          emissiveIntensity: 0.28,
          roughness: 0.08,
          transparent: true,
          opacity: 0.52,
          side: THREE.DoubleSide,
        })
      );
      canopyGlass.scale.set(0.9, 0.88, 1.06);
      canopyGlass.position.set(0, 1.38, 0.28);
      rig.add(canopyGlass);

      const rollArch = new THREE.Mesh(
        createSplineTubeGeometry(
          [
            [-0.86, 1.35, 0.86],
            [-0.78, 2.22, 0.56],
            [0.0, 2.32, 0.48],
            [0.78, 2.22, 0.56],
            [0.86, 1.35, 0.86],
          ],
          0.055,
          14,
          8
        ),
        plowMat
      );
      rig.add(rollArch);

      // 6 treaded bogie wheels (populated in wheels array so update spins them)
      const tireShape = new THREE.CylinderGeometry(0.54, 0.54, 0.46, 16);
      tireShape.rotateZ(Math.PI / 2);
      const hubShape = new THREE.CylinderGeometry(0.26, 0.26, 0.5, 12);
      hubShape.rotateZ(Math.PI / 2);
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x182232, roughness: 0.85 });
      for (const wx of [-1.22, 1.22]) {
        for (const wz of [-1.02, 0.2, 1.42]) {
          const wGroup = new THREE.Group();
          wGroup.position.set(wx, 0.54, wz);
          const tire = new THREE.Mesh(tireShape, wheelMat);
          const hub = new THREE.Mesh(hubShape, plowMat);
          wGroup.add(tire, hub);
          rig.add(wGroup);
          wheels.push(wGroup);
        }
      }

      // Curved beveled concave golden/amber thermal V-plow blade + twin hydraulic struts
      const halfSpan = (hasWide ? 4.6 : 3.15) * 0.52;
      const scoopWingShape = createBeveledWingGeometry(
        [
          [-0.22, 0.16],
          [0.08, 0.2],
          [-0.08, 0.58],
          [0.14, 1.04],
          [-0.12, 1.12],
          [-0.28, 0.58],
        ],
        halfSpan,
        0.045
      );
      scoopWingShape.center();

      const bladeL = new THREE.Mesh(scoopWingShape, plowMat);
      bladeL.rotation.y = Math.PI / 2 + 0.28;
      bladeL.position.set(-halfSpan * 0.46, 0.68, -1.96);

      const bladeR = new THREE.Mesh(scoopWingShape, plowMat);
      bladeR.rotation.y = Math.PI / 2 - 0.28;
      bladeR.position.set(halfSpan * 0.46, 0.68, -1.96);

      const thermalLip = new THREE.Mesh(
        createSplineTubeGeometry(
          [
            [-halfSpan * 0.92, 0.24, -1.72],
            [0.0, 0.22, -2.18],
            [halfSpan * 0.92, 0.24, -1.72],
          ],
          0.085,
          14,
          8
        ),
        hasWide ? magmaMat : glowMat
      );

      for (const sx of [-0.62, 0.62]) {
        const strut = new THREE.Mesh(
          createSplineTubeGeometry(
            [
              [sx, 0.82, -1.28],
              [sx * 0.92, 0.64, -1.86],
            ],
            0.068,
            8,
            8
          ),
          darkMat
        );
        rig.add(strut);
      }

      rig.add(bladeL, bladeR, thermalLip);

      if (hasBoost) {
        for (const tx of [-0.62, 0.62]) {
          const thruster = new THREE.Mesh(
            createLatheProfileGeometry(
              [
                [0.16, -0.34],
                [0.28, 0.0],
                [0.22, 0.34],
              ],
              12
            ),
            glowMat
          );
          thruster.rotation.x = Math.PI / 2;
          thruster.position.set(tx, 0.95, 2.08);
          rig.add(thruster);
        }
      }

      // Seated Arctic Engineer Pilot visible inside cab gripping twin controls
      pilot = buildExplorerPilot3D({ role: "arctic_engineer", seated: true, scale: 0.72 });
      pilot.position.set(0, 1.18, 0.34);
      rig.add(pilot);
    }

    if (hasHarpoon) {
      const turret = new THREE.Group();
      turret.name = "partner_harpoon_turret";
      const drum = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.28, 0.46, 12),
        new THREE.MeshStandardMaterial({
          color: 0xffd166,
          emissive: 0xf4a62a,
          emissiveIntensity: 0.7,
        })
      );
      drum.rotation.z = Math.PI / 2;
      const spear = new THREE.Mesh(
        createLatheProfileGeometry(
          [
            [0.05, -0.35],
            [0.06, 0.1],
            [0.14, 0.14],
            [0.01, 0.45],
          ],
          10
        ),
        new THREE.MeshBasicMaterial({ color: 0xffd166 })
      );
      spear.rotation.x = -Math.PI / 2;
      spear.position.z = -0.52;
      turret.add(drum, spear);
      turret.position.set(0, isSled ? 1.85 : 2.52, isSled ? 0.58 : 0.48);
      rig.add(turret);
    }

    if (hasFox) {
      let fox = null;
      try {
        fox = this.createFoxMeshFn();
      } catch (_) {
        fox = null;
      }
      if (fox && fox.isObject3D) {
        fox.position.set(2.25, 0, 0.55);
        rig.add(fox);
      }
    }

    return { rig, wheels, pilot };
  }

  _buildStatusAuras() {
    // 1. Swirling Cyan Holo-Ring / Blueprint Halo for status === "thinking"
    const thinkingHalo = new THREE.Group();
    thinkingHalo.name = "thinking_halo";
    thinkingHalo.position.set(0, 3.05, 0);
    thinkingHalo.visible = false;

    const cyanMat = new THREE.MeshBasicMaterial({
      color: 0x45f0df,
      transparent: true,
      opacity: 0.88,
    });
    const softCyanMat = new THREE.MeshBasicMaterial({
      color: 0x90f1ef,
      transparent: true,
      opacity: 0.72,
    });

    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.08, 10, 32), cyanMat);
    outerRing.rotation.x = Math.PI / 2;
    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(1.22, 0.06, 8, 28), softCyanMat);
    innerRing.rotation.x = Math.PI / 2 + 0.32;
    thinkingHalo.add(outerRing, innerRing);

    const runeGeo = new THREE.OctahedronGeometry(0.18, 0);
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2;
      const rune = new THREE.Mesh(runeGeo, cyanMat);
      rune.position.set(Math.cos(ang) * 1.65, 0, Math.sin(ang) * 1.65);
      thinkingHalo.add(rune);
    }

    // 2. Radiant Golden Comet Aura & Trail for status === "surge" | "overdrive"
    const surgeComet = new THREE.Group();
    surgeComet.name = "surge_comet_aura";
    surgeComet.position.set(0, 1.15, 0);
    surgeComet.visible = false;

    const goldAuraMat = new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.86,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const tailMat = new THREE.MeshBasicMaterial({
      color: 0xffb703,
      transparent: true,
      opacity: 0.64,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const corona = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.13, 10, 32), goldAuraMat);
    corona.rotation.x = Math.PI / 2;
    surgeComet.add(corona);

    for (const tx of [-0.75, 0, 0.75]) {
      const tail = new THREE.Mesh(new THREE.ConeGeometry(tx === 0 ? 0.58 : 0.4, 2.9, 8), tailMat);
      tail.rotation.x = Math.PI / 2;
      tail.position.set(tx, 0.15, 2.75 + (tx === 0 ? 0.45 : 0));
      surgeComet.add(tail);
    }

    return { thinkingHalo, surgeComet };
  }

  syncRemotePartners(peersInput) {
    let list = [];
    if (Array.isArray(peersInput)) {
      list = peersInput;
    } else if (peersInput instanceof Map || peersInput instanceof Set) {
      list = Array.from(peersInput.values());
    } else if (peersInput && typeof peersInput === "object") {
      list = Object.values(peersInput);
    }

    const activeIds = new Set();

    for (const peer of list) {
      if (!peer || typeof peer !== "object" || Array.isArray(peer)) continue;
      const id =
        safeString(peer.userId, "", 64).trim() ||
        safeString(peer.username, "", 64).trim() ||
        safeString(peer.id, "", 64).trim() ||
        safeString(peer.peerId, "", 64).trim();
      if (!id) continue;
      if (!this.remotePartners.has(id) && activeIds.size >= MAX_REMOTE_PARTNERS) continue;
      activeIds.add(id);

      const chassisId = resolvePartnerChassis(
        peer.chassisOrMount ?? peer.chassisOrAvatar ?? peer.chassisId
      );
      const upgrades = Array.isArray(peer.upgrades)
        ? Array.from(
            new Set(
              peer.upgrades
                .slice(0, MAX_PARTNER_UPGRADES)
                .filter((u) => typeof u === "string" && u.length > 0 && u.length <= 40)
            )
          )
        : [];
      const visualUpgrades = upgrades.filter((u) => VISUAL_PARTNER_UPGRADES.has(u)).sort();
      const upgKey = `${chassisId}:${visualUpgrades.join(",")}`;

      const rawName =
        safeString(peer.displayName, "", 96).trim() ||
        safeString(peer.name, "", 96).trim() ||
        id;
      const cleanDisplayName = clipCodePoints(rawName, 24) || "Partner";
      const cleanAvatar = clipCodePoints(safeString(peer.avatar, "", 24).trim(), 4) || "❄️";
      const badgeLabel =
        clipCodePoints(`${cleanAvatar} ${cleanDisplayName}`.trim(), MAX_BADGE_CHARS) || "Partner";

      const tx = clampFinite(peer.x, -COOP_COORD_LIMIT, COOP_COORD_LIMIT, 0);
      const tz = clampFinite(peer.z, -COOP_COORD_LIMIT, COOP_COORD_LIMIT, 18);
      const defaultY = clampFinite(
        this._safeBaseHeight(tx, tz) + (chassisId === "aurora_sled" ? 0.22 : 0.15),
        COOP_MIN_Y,
        COOP_MAX_Y,
        0
      );
      const ty = clampFinite(peer.y, COOP_MIN_Y, COOP_MAX_Y, defaultY);
      const th = normalizeAngle(peer.heading, Math.PI);
      const spd = clampFinite(peer.speed, -COOP_SPEED_LIMIT, COOP_SPEED_LIMIT, 0);
      const rawStatus = safeString(peer.status, "roaming", 24).trim().toLowerCase();
      const status = ALLOWED_PARTNER_STATUSES.has(rawStatus) ? rawStatus : "roaming";

      let rec = this.remotePartners.get(id);
      if (!rec) {
        const group = new THREE.Group();
        group.name = `remote_partner_${id}`;
        group.rotation.order = "YXZ";

        const { rig, wheels, pilot } = this._buildPartnerRigSubMesh(chassisId, upgrades);
        const { thinkingHalo, surgeComet } = this._buildStatusAuras();

        const tex = createBadgeTexture(badgeLabel);
        const spriteMat = new THREE.SpriteMaterial({
          map: tex,
          transparent: true,
          depthWrite: false,
        });
        const nameSprite = new THREE.Sprite(spriteMat);
        nameSprite.name = "partner_name_badge";
        nameSprite.scale.set(4.2, 1.05, 1);
        nameSprite.position.set(0, 3.85, 0);
        nameSprite.userData = { label: badgeLabel };

        group.add(rig, thinkingHalo, surgeComet, nameSprite);
        group.position.set(tx, ty, tz);
        group.rotation.y = th;
        this.rootGroup.add(group);

        rec = {
          userId: id,
          displayName: cleanDisplayName,
          avatar: cleanAvatar,
          badgeLabel,
          chassisId,
          upgrades,
          upgKey,
          x: tx,
          y: ty,
          z: tz,
          heading: th,
          targetX: tx,
          targetY: ty,
          targetZ: tz,
          targetHeading: th,
          speed: spd,
          status,
          group,
          rigMesh: rig,
          wheels,
          pilot,
          thinkingHalo,
          surgeComet,
          nameSprite,
        };
        this.remotePartners.set(id, rec);
      } else {
        rec.targetX = tx;
        rec.targetY = ty;
        rec.targetZ = tz;
        rec.targetHeading = th;
        rec.speed = spd;
        rec.status = status;
        rec.upgrades = upgrades;

        if (rec.upgKey !== upgKey) {
          const oldRig = rec.rigMesh;
          rec.group.remove(oldRig);
          disposeObjectSubtree(oldRig);
          const built = this._buildPartnerRigSubMesh(chassisId, upgrades);
          rec.rigMesh = built.rig;
          rec.wheels = built.wheels;
          rec.pilot = built.pilot;
          rec.chassisId = chassisId;
          rec.upgKey = upgKey;
          rec.group.add(rec.rigMesh);
        }

        if (rec.badgeLabel !== badgeLabel) {
          rec.badgeLabel = badgeLabel;
          rec.displayName = cleanDisplayName;
          rec.avatar = cleanAvatar;
          const prevMap = rec.nameSprite.material.map;
          rec.nameSprite.material.map = createBadgeTexture(badgeLabel);
          rec.nameSprite.material.needsUpdate = true;
          rec.nameSprite.userData.label = badgeLabel;
          if (prevMap && typeof prevMap.dispose === "function") {
            try {
              prevMap.dispose();
            } catch (_) {}
          }
        }
      }

      rec.thinkingHalo.visible = rec.status === "thinking";
      rec.surgeComet.visible = rec.status === "surge" || rec.status === "overdrive";
    }

    for (const [existingId, rec] of this.remotePartners.entries()) {
      if (!activeIds.has(existingId)) {
        this.rootGroup.remove(rec.group);
        disposeObjectSubtree(rec.group);
        this.remotePartners.delete(existingId);
      }
    }
  }

  syncSharedCoins(coinStatesInput) {
    if (!coinStatesInput || typeof coinStatesInput !== "object") return;

    const resolveEntry = (coinId) => {
      if (coinStatesInput instanceof Map) return coinStatesInput.get(coinId);
      if (Array.isArray(coinStatesInput)) {
        return coinStatesInput.find(
          (c) => c && typeof c === "object" && !Array.isArray(c) && c.coinId === coinId
        );
      }
      if (Object.prototype.hasOwnProperty.call(coinStatesInput, coinId)) {
        return coinStatesInput[coinId];
      }
      return undefined;
    };

    for (const [coinId, coin] of this.sharedCoins.entries()) {
      const incoming = resolveEntry(coinId);
      if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) continue;
      const nextAvail = incoming.available !== false;
      const wasHidden = !coin.group.visible;
      coin.available = nextAvail;
      coin.localGrabLatchSec = 0;
      coin.group.visible = nextAvail;
      if (nextAvail && wasHidden) {
        coin.popScale = 0.15;
        coin.spinner.scale.setScalar(coin.popScale);
      }
    }
  }

  _spawnStarlightFirework(x, y, z) {
    const sx = clampFinite(x, -COOP_COORD_LIMIT, COOP_COORD_LIMIT, 0);
    const sz = clampFinite(z, -COOP_COORD_LIMIT, COOP_COORD_LIMIT, 0);
    const sy = clampFinite(y, COOP_MIN_Y, COOP_MAX_Y, this._safeBaseHeight(sx, sz));

    const group = new THREE.Group();
    group.name = "coop_starlight_flare";
    const startY = sy + 2.2;
    group.position.set(sx, startY, sz);

    const starMat = new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.96,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const heartMat = new THREE.MeshBasicMaterial({
      color: 0xff7aa2,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.72, 0), starMat);
    group.add(core);

    // 3D Parametric Heart Outline Ribbon + 8 Starlight Rays
    const heartPts = [];
    for (let i = 0; i <= 28; i++) {
      const t = (i / 28) * Math.PI * 2;
      const hx = 0.095 * 16 * Math.pow(Math.sin(t), 3);
      const hy =
        0.095 *
        (13 * Math.cos(t) -
          5 * Math.cos(2 * t) -
          2 * Math.cos(3 * t) -
          Math.cos(4 * t));
      heartPts.push(new THREE.Vector3(hx, hy, 0));
    }
    const heartCurve = new THREE.CatmullRomCurve3(heartPts, true);
    const heartTube = new THREE.Mesh(new THREE.TubeGeometry(heartCurve, 32, 0.09, 6, true), heartMat);
    group.add(heartTube);

    const rayGeo = new THREE.BoxGeometry(0.12, 1.9, 0.12);
    for (let r = 0; r < 4; r++) {
      const ray = new THREE.Mesh(rayGeo, starMat);
      ray.rotation.z = (r / 4) * Math.PI;
      group.add(ray);
    }

    this.rootGroup.add(group);
    this._safeSpawnBurst(sx, startY + 3.2, sz, 28);
    const effect = {
      kind: "flare_firework",
      group,
      materials: [starMat, heartMat],
      startY,
      targetY: startY + 5.2,
      life: 1.85,
      maxLife: 1.85,
    };
    return this._pushBoundedEffect(effect);
  }

  _spawnGateSkyBeamAndResonance(x, y, z, overdrive = false) {
    const sx = clampFinite(x, -COOP_COORD_LIMIT, COOP_COORD_LIMIT, 0);
    const sz = clampFinite(z, -COOP_COORD_LIMIT, COOP_COORD_LIMIT, 0);
    const groundY = clampFinite(y, COOP_MIN_Y, COOP_MAX_Y, this._safeBaseHeight(sx, sz));

    const group = new THREE.Group();
    group.name = "coop_gate_burst_fx";
    group.position.set(sx, groundY, sz);

    const beamColor = overdrive ? 0xffd166 : 0x45f0df;
    const beamMat = new THREE.MeshBasicMaterial({
      color: beamColor,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const skyBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 2.35, 42, 16, 1, true),
      beamMat
    );
    skyBeam.name = "coop_sky_beam";
    skyBeam.position.y = 21;
    group.add(skyBeam);

    const pulseGeo = new THREE.RingGeometry(1.6, 2.5, 40);
    pulseGeo.rotateX(-Math.PI / 2);
    const pulseMat = new THREE.MeshBasicMaterial({
      color: 0x5ce1e6,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const pulseRing = new THREE.Mesh(pulseGeo, pulseMat);
    pulseRing.name = "coop_resonance_pulse";
    pulseRing.position.y = 0.58;
    group.add(pulseRing);

    this.rootGroup.add(group);
    this._safeSpawnBurst(sx, groundY + 8.5, sz, overdrive ? 56 : 40);
    const effect = {
      kind: "gate_burst",
      group,
      skyBeam,
      pulseRing,
      materials: [beamMat, pulseMat],
      life: 2.1,
      maxLife: 2.1,
    };
    return this._pushBoundedEffect(effect);
  }

  playPartnerCoopEvent(event = {}) {
    if (!event || typeof event !== "object" || Array.isArray(event)) return null;
    const eventType = safeString(event.type, "", 32).trim();
    const partnerId = safeString(event.userId, "", 64).trim();
    const partner = partnerId ? this.remotePartners.get(partnerId) : null;

    const fallbackX = partner ? clampFinite(partner.x, -COOP_COORD_LIMIT, COOP_COORD_LIMIT, 0) : 0;
    const fallbackZ = partner ? clampFinite(partner.z, -COOP_COORD_LIMIT, COOP_COORD_LIMIT, -11) : -11;
    const ex = clampFinite(event.x, -COOP_COORD_LIMIT, COOP_COORD_LIMIT, fallbackX);
    const ez = clampFinite(event.z, -COOP_COORD_LIMIT, COOP_COORD_LIMIT, fallbackZ);
    const fallbackY = partner
      ? clampFinite(partner.y, COOP_MIN_Y, COOP_MAX_Y, this._safeBaseHeight(ex, ez))
      : this._safeBaseHeight(ex, ez);
    const ey = clampFinite(event.y, COOP_MIN_Y, COOP_MAX_Y, fallbackY);

    if (eventType === "gate_burst") {
      // STRICT RESOURCE FAIRNESS: Celebrates partner clear with towering 3D Aurora Sky-Beam
      // and Co-Op Resonance Pulse WITHOUT touching any local gate, beacon, fox, or upgrade!
      this.audio?.playCoopGateBurst?.(Boolean(event.overdrive));
      return this._spawnGateSkyBeamAndResonance(ex, ey, ez, Boolean(event.overdrive));
    }

    if (eventType === "friendly_flare") {
      this.audio?.playCoopFlare?.();
      return this._spawnStarlightFirework(ex, ey, ez);
    }

    if (eventType === "coin_grab") {
      const cid = safeString(event.coinId, "", 32).trim();
      const coin = cid ? this.sharedCoins.get(cid) : null;
      const cx = coin ? coin.x : ex;
      const cz = coin ? coin.z : ez;
      const cy = coin ? coin.baseY + 1.3 : ey + 1.3;
      if (coin) {
        coin.available = false;
        coin.localGrabLatchSec = 6.0;
        coin.group.visible = false;
      }
      this._safeSpawnBurst(cx, cy, cz, 32);
      this.audio?.playCoinGrab?.();
      return { kind: "coin_grab", coinId: cid || null };
    }

    return null;
  }

  playLocalFlare(rigState = null) {
    const rs = rigState && typeof rigState === "object" ? rigState : null;
    const fx = clampFinite(rs?.x, -COOP_COORD_LIMIT, COOP_COORD_LIMIT, 0);
    const fz = clampFinite(rs?.z, -COOP_COORD_LIMIT, COOP_COORD_LIMIT, 22);
    const fy = clampFinite(rs?.y, COOP_MIN_Y, COOP_MAX_Y, this._safeBaseHeight(fx, fz));
    this.audio?.playCoopFlare?.();
    return this._spawnStarlightFirework(fx, fy, fz);
  }

  update(dt, rigState, skipCoinPickup = false) {
    const rawDt = toFiniteNumber(dt, 0);
    if (!(rawDt > 0)) return;
    const stepDt = Math.min(10.0, rawDt);
    this.elapsed = (this.elapsed + stepDt) % ELAPSED_WRAP_RAD;

    // 1. 60fps Remote Partner Interpolation & Status Aura Animation
    const lerpAlpha = 1 - Math.exp(-12.5 * stepDt);
    for (const rec of this.remotePartners.values()) {
      const curX = clampFinite(rec.x, -COOP_COORD_LIMIT, COOP_COORD_LIMIT, 0);
      const curZ = clampFinite(rec.z, -COOP_COORD_LIMIT, COOP_COORD_LIMIT, 18);
      const tgtX = clampFinite(rec.targetX, -COOP_COORD_LIMIT, COOP_COORD_LIMIT, curX);
      const tgtZ = clampFinite(rec.targetZ, -COOP_COORD_LIMIT, COOP_COORD_LIMIT, curZ);

      rec.x = clampFinite(
        curX + (tgtX - curX) * lerpAlpha,
        -COOP_COORD_LIMIT,
        COOP_COORD_LIMIT,
        tgtX
      );
      rec.z = clampFinite(
        curZ + (tgtZ - curZ) * lerpAlpha,
        -COOP_COORD_LIMIT,
        COOP_COORD_LIMIT,
        tgtZ
      );

      const groundY = clampFinite(
        this._safeBaseHeight(rec.x, rec.z) + (rec.chassisId === "aurora_sled" ? 0.22 : 0.15),
        COOP_MIN_Y,
        COOP_MAX_Y,
        0
      );
      const rawTargetY = toFiniteNumber(rec.targetY, NaN);
      const clampedTargetY = Number.isFinite(rawTargetY)
        ? Math.max(COOP_MIN_Y, Math.min(COOP_MAX_Y, rawTargetY))
        : groundY;
      const desiredY = clampedTargetY > groundY + 0.3 ? clampedTargetY : groundY;
      const curY = clampFinite(rec.y, COOP_MIN_Y, COOP_MAX_Y, desiredY);
      rec.y = clampFinite(curY + (desiredY - curY) * lerpAlpha, COOP_MIN_Y, COOP_MAX_Y, desiredY);

      rec.targetX = tgtX;
      rec.targetZ = tgtZ;
      rec.targetY = clampedTargetY;
      rec.targetHeading = normalizeAngle(rec.targetHeading, Math.PI);
      rec.heading = shortestAngleLerp(rec.heading, rec.targetHeading, lerpAlpha);
      rec.speed = clampFinite(rec.speed, -COOP_SPEED_LIMIT, COOP_SPEED_LIMIT, 0);

      rec.group.position.set(rec.x, rec.y, rec.z);
      rec.group.rotation.y = rec.heading;

      for (const w of rec.wheels) {
        w.rotation.x = normalizeAngle(w.rotation.x - rec.speed * stepDt * 1.35, 0);
      }

      if (rec.pilot) {
        const speedNorm = Math.min(1.2, Math.abs(rec.speed) / 18);
        animateExplorerPilot3D(
          rec.pilot,
          this.elapsed,
          speedNorm,
          0,
          rec.y > groundY + 0.35
        );
      }

      rec.thinkingHalo.visible = rec.status === "thinking";
      if (rec.thinkingHalo.visible) {
        rec.thinkingHalo.rotation.y = normalizeAngle(this.elapsed * 2.2, 0);
      }

      rec.surgeComet.visible = rec.status === "surge" || rec.status === "overdrive";
      if (rec.surgeComet.visible) {
        const pulse = 1 + Math.sin(this.elapsed * 6.5) * 0.08;
        rec.surgeComet.scale.setScalar(pulse);
      }
    }

    // 2. Shared Star-Coins Spin, Bounce & Local <= 2.8m Pickup
    const rx = rigState && typeof rigState === "object" ? toFiniteNumber(rigState.x, NaN) : NaN;
    const rz = rigState && typeof rigState === "object" ? toFiniteNumber(rigState.z, NaN) : NaN;
    const canCheckPickup = !skipCoinPickup && Number.isFinite(rx) && Number.isFinite(rz);

    for (const coin of this.sharedCoins.values()) {
      if (coin.localGrabLatchSec > 0) {
        coin.localGrabLatchSec = Math.max(0, coin.localGrabLatchSec - stepDt);
        if (coin.localGrabLatchSec === 0 && coin.available) {
          coin.group.visible = true;
          coin.popScale = 0.15;
        }
      }

      if (!coin.group.visible) continue;

      if (coin.popScale < 1.0) {
        coin.popScale = Math.min(1.0, coin.popScale + stepDt * 4.2);
        coin.spinner.scale.setScalar(coin.popScale);
      }
      coin.spinner.rotation.y = normalizeAngle(coin.spinner.rotation.y + stepDt * 2.9, 0);
      coin.spinner.position.y = 1.25 + Math.sin(this.elapsed * 3.4 + coin.index * 1.4) * 0.26;
      coin.haloMesh.rotation.z = normalizeAngle(this.elapsed * 1.1, 0);

      if (
        canCheckPickup &&
        coin.available &&
        coin.localGrabLatchSec <= 0 &&
        Math.hypot(rx - coin.x, rz - coin.z) <= SHARED_COIN_PICKUP_RADIUS
      ) {
        coin.localGrabLatchSec = 6.0;
        coin.group.visible = false;
        this._safeSpawnBurst(coin.x, coin.baseY + 1.3, coin.z, 32);
        this.audio?.playCoinGrab?.();
        this.onSharedCoinGrabbed(coin.coinId);
      }
    }

    // 3. Active Celebratory Sky-Beams, Resonance Pulses & Starlight Flares
    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const fx = this.activeEffects[i];
      fx.life -= stepDt;
      if (!(fx.life > 0) || !(fx.maxLife > 0)) {
        this.rootGroup.remove(fx.group);
        disposeObjectSubtree(fx.group);
        this.activeEffects.splice(i, 1);
        continue;
      }
      const u = Math.max(0, Math.min(1, 1 - fx.life / fx.maxLife));
      if (fx.kind === "flare_firework") {
        const rise = Math.min(1, u * 2.2);
        fx.group.position.y = fx.startY + (fx.targetY - fx.startY) * (1 - Math.pow(1 - rise, 2));
        const bloom = 0.45 + Math.sin(Math.min(1, u * 1.35) * Math.PI * 0.65) * 1.15;
        fx.group.scale.setScalar(bloom);
        fx.group.rotation.y = normalizeAngle(fx.group.rotation.y + stepDt * 1.8, 0);
        const fade = Math.min(1, fx.life * 1.8);
        for (const m of fx.materials) m.opacity = fade * 0.92;
      } else if (fx.kind === "gate_burst") {
        fx.pulseRing.scale.setScalar(1 + u * 15.5);
        fx.skyBeam.rotation.y = normalizeAngle(fx.skyBeam.rotation.y + stepDt * 2.4, 0);
        const fade = Math.min(1, fx.life * 1.4);
        fx.materials[0].opacity = fade * 0.78;
        fx.materials[1].opacity = Math.max(0, (1 - u) * 0.85);
      }
    }
  }
}
