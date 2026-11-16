/**
 * Arc Bastion: Siegesmiths — Live 2-Player 3D Co-Op Presence, Sky-Flares & Shared Star-Coins
 * Renders 60fps-interpolated remote partner Siege-Rovers, zero-shame status halos,
 * celebratory Citadel Sky-Flares & Partner Gate Bursts (100% non-stealable batteries),
 * and 4 playful Shared Star-Coins across the Sky-Bastion courtyard & ramparts.
 */

import * as THREE from "../vendor/three.module.min.js";
import { SHARED_COIN_IDS } from "../core/multiplayer.js";

export { SHARED_COIN_IDS };

export const SHARED_COIN_SPECS = [
  { coinId: "coin_0", x: -11, z: 8 },
  { coinId: "coin_1", x: 11, z: 8 },
  { coinId: "coin_2", x: -15, z: -12 },
  { coinId: "coin_3", x: 15, z: -12 },
];

export const SHARED_COIN_PICKUP_RADIUS = 2.8;
const COOP_COORD_LIMIT = 120;
const COOP_MIN_Y = -24;
const COOP_MAX_Y = 85;
const MAX_REMOTE_PARTNERS = 16;
const MAX_BADGE_CHARS = 18;
const MAX_ACTIVE_COOP_EFFECTS = 48;

const ALLOWED_PARTNER_STATUSES = new Set(["roaming", "thinking", "overdrive", "surge"]);

function safeString(val, fallback = "", maxLen = 64) {
  if (typeof val === "string") return maxLen > 0 ? val.slice(0, maxLen) : val;
  if (typeof val === "number") {
    return Number.isFinite(val) ? String(val).slice(0, maxLen) : fallback;
  }
  return fallback;
}

function clipCodePoints(str, maxPoints) {
  const bounded = safeString(str, "", maxPoints * 4);
  const points = Array.from(bounded);
  return points.length > maxPoints ? points.slice(0, maxPoints).join("") : bounded;
}

function clampFinite(val, min, max, fallback = 0) {
  const n = Number(val);
  if (!Number.isFinite(n)) return Math.max(min, Math.min(max, fallback));
  return Math.max(min, Math.min(max, n));
}

export function normalizeAngle(rad, fallback = 0) {
  const n = Number(rad);
  if (!Number.isFinite(n)) return fallback;
  return Math.atan2(Math.sin(n), Math.cos(n));
}

export function shortestAngleLerp(current, target, alpha) {
  const cur = normalizeAngle(current, 0);
  const tgt = normalizeAngle(target, cur);
  const t = clampFinite(alpha, 0, 1, 0);
  const rawDiff = tgt - cur;
  const diff = Math.atan2(Math.sin(rawDiff), Math.cos(rawDiff));
  return normalizeAngle(cur + diff * t, cur);
}

function resolvePartnerRigId(raw) {
  const s = safeString(raw, "", 48).toLowerCase();
  if (s.includes("skiff") || s.includes("sled") || s.includes("glider") || s.includes("prism")) {
    return "prism_rail_skiff";
  }
  return "iron_ballista";
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
        ctx.fillStyle = "rgba(18, 28, 52, 0.88)";
        ctx.strokeStyle = "#7ee8fa";
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
        ctx.fillStyle = "#fff8dc";
        ctx.font = "bold 24px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(safeLabel, 128, 33);
        const tex = new THREE.CanvasTexture(canvas);
        tex.needsUpdate = true;
        return tex;
      }
    } catch (_) {}
  }

  // Headless Node DataTexture fallback
  const width = 64;
  const height = 16;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const border = x <= 1 || x >= width - 2 || y <= 1 || y >= height - 2;
      data[i] = border ? 126 : 22;
      data[i + 1] = border ? 232 : 34;
      data[i + 2] = border ? 250 : 62;
      data[i + 3] = border ? 245 : 220;
    }
  }
  const tex = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}

export class BastionCoop3D {
  constructor(opts = {}) {
    const safeOpts = opts && typeof opts === "object" ? opts : {};
    this.scene = safeOpts.scene && typeof safeOpts.scene.add === "function" ? safeOpts.scene : null;
    this.baseHeightFn =
      typeof safeOpts.baseHeightFn === "function" ? safeOpts.baseHeightFn : () => 0;
    this.spawnGearBurstFn =
      typeof safeOpts.spawnGearBurstFn === "function" ? safeOpts.spawnGearBurstFn : () => {};
    this.audio = safeOpts.audio || null;
    this.onSharedCoinGrabbed =
      typeof safeOpts.onSharedCoinGrabbed === "function" ? safeOpts.onSharedCoinGrabbed : () => {};

    this.elapsed = 0;
    this.rootGroup = new THREE.Group();
    this.rootGroup.name = "bastion_coop_root";
    if (this.scene) this.scene.add(this.rootGroup);

    this.remotePartners = new Map();
    this.sharedCoins = new Map();
    this.activeEffects = [];

    this._buildSharedCoins();
  }

  _groundY(x, z) {
    const sx = clampFinite(x, -COOP_COORD_LIMIT, COOP_COORD_LIMIT, 0);
    const sz = clampFinite(z, -COOP_COORD_LIMIT, COOP_COORD_LIMIT, 0);
    try {
      return clampFinite(this.baseHeightFn(sx, sz), COOP_MIN_Y, COOP_MAX_Y, 0);
    } catch (_) {
      return 0;
    }
  }

  _buildSharedCoins() {
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.92,
      roughness: 0.18,
      metalness: 0.58,
    });
    const gemMat = new THREE.MeshStandardMaterial({
      color: 0x7ee8fa,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.05,
      roughness: 0.12,
    });
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    for (let i = 0; i < SHARED_COIN_SPECS.length; i++) {
      const spec = SHARED_COIN_SPECS[i];
      const coinId = SHARED_COIN_IDS[i] || spec.coinId;
      const g = new THREE.Group();
      g.name = `shared_coin_${coinId}`;

      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.24, 12), goldMat);
      disc.rotation.z = Math.PI / 2;
      disc.position.y = 1.15;
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.56, 0), gemMat);
      star.position.y = 1.15;
      const halo = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.38, 24), haloMat);
      halo.rotation.x = -Math.PI / 2;
      halo.position.y = 0.1;

      g.add(disc, star, halo);
      const y = this._groundY(spec.x, spec.z);
      g.position.set(spec.x, y, spec.z);
      this.rootGroup.add(g);

      this.sharedCoins.set(coinId, {
        coinId,
        x: spec.x,
        y,
        z: spec.z,
        available: true,
        localGrabCooldown: 0,
        group: g,
        disc,
        star,
      });
    }
  }

  _buildPartnerMesh(rigId = "iron_ballista", labelText = "Partner", upgrades = []) {
    const g = new THREE.Group();
    g.name = "remote_partner_rover";

    const isSkiff = rigId === "prism_rail_skiff";
    const upSet = new Set(Array.isArray(upgrades) ? upgrades : []);
    const primaryMat = new THREE.MeshStandardMaterial({
      color: upSet.has("ab_citadel_crown") ? 0xffd166 : isSkiff ? 0x7ee8fa : 0x5aa9ff,
      emissive: isSkiff ? 0x1d7dfa : 0x1e40af,
      emissiveIntensity: 0.45,
      roughness: 0.24,
      metalness: 0.48,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd9a441,
      roughness: 0.26,
      metalness: 0.72,
    });

    if (isSkiff) {
      const hull = new THREE.Mesh(new THREE.ConeGeometry(1.15, 4.1, 6), primaryMat);
      hull.rotation.x = -Math.PI / 2;
      hull.position.y = 0.95;
      const fins = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.14, 1.3), brassMat);
      fins.position.set(0, 0.85, 0.35);
      g.add(hull, fins);
    } else {
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.92, 3.3), primaryMat);
      body.position.y = 0.95;
      const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.78, 0.62, 10), brassMat);
      turret.position.set(0, 1.68, 0.15);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 1.6, 8), brassMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 1.72, -0.95);
      g.add(body, turret, barrel);
    }

    if (upSet.has("ab_chronos_harp")) {
      const harp = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.06, 8, 18), brassMat);
      harp.position.set(0, 2.35, 0.45);
      g.add(harp);
    }

    const statusRingMat = new THREE.MeshBasicMaterial({
      color: 0x7ee8fa,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const statusRing = new THREE.Mesh(new THREE.RingGeometry(1.85, 2.22, 28), statusRingMat);
    statusRing.rotation.x = -Math.PI / 2;
    statusRing.position.y = 0.12;
    statusRing.name = "partner_status_ring";
    g.add(statusRing);

    const badgeTex = createBadgeTexture(labelText);
    const badgeSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: badgeTex,
        transparent: true,
        depthWrite: false,
      })
    );
    badgeSprite.name = "partner_name_badge";
    badgeSprite.scale.set(3.2, 0.82, 1);
    badgeSprite.position.set(0, 3.25, 0);
    g.add(badgeSprite);

    return { group: g, statusRing, statusRingMat, badgeSprite, badgeTex };
  }

  syncRemotePartners(peersArray = []) {
    const incoming = Array.isArray(peersArray) ? peersArray.slice(0, MAX_REMOTE_PARTNERS) : [];
    const seenIds = new Set();

    for (let i = 0; i < incoming.length; i++) {
      const raw = incoming[i];
      if (!raw || typeof raw !== "object") continue;
      const peerId =
        safeString(raw.peerId || raw.clientId || raw.profileId || raw.id, "", 64) || `peer_${i}`;
      seenIds.add(peerId);

      const rigId = resolvePartnerRigId(raw.chassisOrMount || raw.rigId || raw.chassisId);
      const displayName = safeString(raw.displayName || raw.name || "Partner", "Partner", 32);
      const avatar = safeString(raw.avatar || "🛡️", "🛡️", 8);
      const label = `${avatar} ${displayName}`.trim();
      const statusRaw = safeString(raw.status, "roaming", 24).toLowerCase();
      const status = ALLOWED_PARTNER_STATUSES.has(statusRaw) ? statusRaw : "roaming";
      const upgrades = Array.isArray(raw.upgrades) ? raw.upgrades.slice(0, 8) : [];

      const tx = clampFinite(raw.x, -COOP_COORD_LIMIT, COOP_COORD_LIMIT, 4);
      const tz = clampFinite(raw.z, -COOP_COORD_LIMIT, COOP_COORD_LIMIT, 14);
      const ty = clampFinite(raw.y, COOP_MIN_Y, COOP_MAX_Y, this._groundY(tx, tz) + 0.16);
      const th = normalizeAngle(raw.heading, 0);

      let entry = this.remotePartners.get(peerId);
      if (!entry || entry.rigId !== rigId || entry.label !== label) {
        if (entry && entry.group) {
          this.rootGroup.remove(entry.group);
        }
        const built = this._buildPartnerMesh(rigId, label, upgrades);
        built.group.position.set(tx, ty, tz);
        built.group.rotation.y = th;
        this.rootGroup.add(built.group);
        entry = {
          peerId,
          rigId,
          label,
          status,
          x: tx,
          y: ty,
          z: tz,
          heading: th,
          targetX: tx,
          targetY: ty,
          targetZ: tz,
          targetHeading: th,
          ...built,
        };
        this.remotePartners.set(peerId, entry);
      } else {
        entry.targetX = tx;
        entry.targetY = ty;
        entry.targetZ = tz;
        entry.targetHeading = th;
        entry.status = status;
      }

      const ringColor =
        status === "overdrive" || status === "surge"
          ? 0xffd166
          : status === "thinking"
          ? 0xc084fc
          : 0x7ee8fa;
      entry.statusRingMat.color.setHex(ringColor);
    }

    for (const [peerId, entry] of this.remotePartners.entries()) {
      if (!seenIds.has(peerId)) {
        if (entry.group) this.rootGroup.remove(entry.group);
        this.remotePartners.delete(peerId);
      }
    }
  }

  _pushEffect(group, dur = 1.6, kind = "flare") {
    while (this.activeEffects.length >= MAX_ACTIVE_COOP_EFFECTS) {
      const oldest = this.activeEffects.shift();
      if (oldest?.group) this.rootGroup.remove(oldest.group);
    }
    this.rootGroup.add(group);
    const eff = { group, t: 0, dur, kind };
    this.activeEffects.push(eff);
    return eff;
  }

  _spawnSkyFlareAt(x, y, z, colorHex = 0xffd166) {
    const g = new THREE.Group();
    g.name = "coop_sky_flare_firework";
    g.position.set(x, y, z);

    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.55, 18.0, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.78,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    beam.position.y = 9.0;
    const crown = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.25, 0),
      new THREE.MeshBasicMaterial({
        color: 0x7ee8fa,
        transparent: true,
        opacity: 0.92,
      })
    );
    crown.position.y = 14.5;
    g.add(beam, crown);
    this._pushEffect(g, 1.8, "flare");
    this.spawnGearBurstFn(x, y + 2.5, z, 20);
    return { kind: "flare", x, y, z };
  }

  playLocalFlare(rigState = { x: 0, y: 0, z: 14 }) {
    const sx = clampFinite(rigState?.x, -COOP_COORD_LIMIT, COOP_COORD_LIMIT, 0);
    const sz = clampFinite(rigState?.z, -COOP_COORD_LIMIT, COOP_COORD_LIMIT, 14);
    const sy = clampFinite(rigState?.y, COOP_MIN_Y, COOP_MAX_Y, this._groundY(sx, sz));
    this.audio?.playCoopFlare?.();
    return this._spawnSkyFlareAt(sx, sy, sz, 0xffd166);
  }

  playPartnerCoopEvent(event = {}) {
    if (!event || typeof event !== "object") return null;
    const kind = safeString(event.kind || event.type, "flare", 32).toLowerCase();
    const sx = clampFinite(event.x, -COOP_COORD_LIMIT, COOP_COORD_LIMIT, 0);
    const sz = clampFinite(event.z, -COOP_COORD_LIMIT, COOP_COORD_LIMIT, 0);
    const sy = clampFinite(event.y, COOP_MIN_Y, COOP_MAX_Y, this._groundY(sx, sz));

    if (kind === "gate_clear" || kind === "shrine_clear" || kind === "battery_clear") {
      this.audio?.playCoopGateBurst?.();
      return this._spawnSkyFlareAt(sx, sy, sz, 0x7ee8fa);
    }
    this.audio?.playCoopFlare?.();
    return this._spawnSkyFlareAt(sx, sy, sz, 0xffd166);
  }

  syncSharedCoins(coinStatesMap = {}) {
    if (!coinStatesMap || typeof coinStatesMap !== "object") return;
    for (const [coinId, rec] of this.sharedCoins.entries()) {
      const incoming = coinStatesMap[coinId];
      if (!incoming) continue;
      const isAvail =
        typeof incoming === "boolean"
          ? incoming
          : incoming.available !== undefined
          ? Boolean(incoming.available)
          : !incoming.collectedBy;
      rec.available = isAvail;
      if (isAvail) rec.localGrabCooldown = 0;
      rec.group.visible = isAvail;
    }
  }

  update(dt, rigState = null, suppressCoinGrab = false) {
    const safeDt = clampFinite(dt, 0, 0.25, 0);
    if (!(safeDt > 0)) return;
    this.elapsed += safeDt;

    // 1. Interpolate remote partner Siege-Rovers at 60fps
    const blend = Math.min(1, safeDt * 10.5);
    for (const entry of this.remotePartners.values()) {
      entry.x += (entry.targetX - entry.x) * blend;
      entry.y += (entry.targetY - entry.y) * blend;
      entry.z += (entry.targetZ - entry.z) * blend;
      entry.heading = shortestAngleLerp(entry.heading, entry.targetHeading, blend);
      entry.group.position.set(entry.x, entry.y, entry.z);
      entry.group.rotation.y = entry.heading;
      entry.statusRing.rotation.z = this.elapsed * 1.4;
    }

    // 2. Spin Shared Star-Coins & check local rover pickup
    const rx = Number(rigState?.x);
    const rz = Number(rigState?.z);
    const canGrab = !suppressCoinGrab && Number.isFinite(rx) && Number.isFinite(rz);

    for (const rec of this.sharedCoins.values()) {
      if (rec.localGrabCooldown > 0) {
        rec.localGrabCooldown = Math.max(0, rec.localGrabCooldown - safeDt);
      }
      if (!rec.available) continue;
      rec.disc.rotation.y = this.elapsed * 2.2;
      rec.star.rotation.y = -this.elapsed * 2.8;
      rec.group.position.y = rec.y + Math.sin(this.elapsed * 2.6 + rec.x) * 0.18;

      if (
        canGrab &&
        rec.localGrabCooldown <= 0 &&
        Math.hypot(rx - rec.x, rz - rec.z) <= SHARED_COIN_PICKUP_RADIUS
      ) {
        rec.available = false;
        rec.localGrabCooldown = 2.0;
        rec.group.visible = false;
        this.audio?.playRelicChime?.();
        this.spawnGearBurstFn(rec.x, rec.y + 1.1, rec.z, 16);
        this.onSharedCoinGrabbed(rec.coinId);
      }
    }

    // 3. Step Sky-Flare & Partner Gate Burst effects
    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const eff = this.activeEffects[i];
      eff.t += safeDt;
      const p = Math.min(1, eff.t / eff.dur);
      eff.group.scale.set(1 + p * 0.45, 1 + p * 0.15, 1 + p * 0.45);
      eff.group.traverse((obj) => {
        if (obj.material && obj.material.transparent) {
          obj.material.opacity = Math.max(0, (1 - p) * 0.85);
        }
      });
      if (p >= 1) {
        this.rootGroup.remove(eff.group);
        this.activeEffects.splice(i, 1);
      }
    }
  }

  dispose() {
    if (this.scene && this.rootGroup) {
      this.scene.remove(this.rootGroup);
    }
    this.remotePartners.clear();
    this.activeEffects = [];
  }
}
