/**
 * Oddroot Wilds — Live 2-Player 3D Co-Op Partner Presence, Status Auras & Shared Star-Coins
 * Renders 60fps-lerped remote sibling avatars/mounts, floating name/avatar badges,
 * zero-shame graphical status auras (Cyan Holo-Ring when thinking, Golden Comet Aura on Surge),
 * non-stealable 3D Aurora Sky-Beams + Co-Op Resonance Pulses, Starlight Flares, and
 * 4 shared bouncing 3D Star-Coins along open sanctuary bridges.
 */

import * as THREE from "../vendor/three.module.min.js";

export const SHARED_COIN_IDS = ["coin_0", "coin_1", "coin_2", "coin_3"];
export const COIN_PICKUP_RADIUS = 2.8;

export const SHARED_COIN_POSITIONS = {
  coin_0: { coinId: "coin_0", x: 0.0, z: 13.5 },
  coin_1: { coinId: "coin_1", x: -14.2, z: -6.4 },
  coin_2: { coinId: "coin_2", x: 14.2, z: -6.4 },
  coin_3: { coinId: "coin_3", x: 0.0, z: -16.6 },
};

function normalizeAngleRad(rad, fallback = 0) {
  const n = Number(rad);
  if (!Number.isFinite(n)) return fallback;
  if (Math.abs(n) <= Math.PI * 2) return n;
  return Math.atan2(Math.sin(n), Math.cos(n));
}

function clampPartnerCoord(val, fallback = 0) {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(-5000, Math.min(5000, n));
}

function wrapAngleDelta(fromRad, toRad) {
  const f = Number(fromRad);
  const t = Number(toRad);
  if (!Number.isFinite(f) || !Number.isFinite(t)) return 0;
  const d = t - f;
  if (!Number.isFinite(d)) {
    const nf = Math.atan2(Math.sin(f), Math.cos(f));
    const nt = Math.atan2(Math.sin(t), Math.cos(t));
    return Math.atan2(Math.sin(nt - nf), Math.cos(nt - nf));
  }
  return Math.atan2(Math.sin(d), Math.cos(d));
}

function createPartnerBadgeTexture(label = "Partner", avatar = "🦊") {
  const fullText = `${avatar || "🦊"} ${label || "Explorer"}`.slice(0, 22);
  if (typeof document !== "undefined" && typeof document.createElement === "function") {
    try {
      const cvs = document.createElement("canvas");
      cvs.width = 256;
      cvs.height = 64;
      const ctx = typeof cvs.getContext === "function" ? cvs.getContext("2d") : null;
      if (ctx) {
        ctx.clearRect(0, 0, 256, 64);
        ctx.fillStyle = "rgba(10, 38, 36, 0.88)";
        ctx.strokeStyle = "#5ef2c8";
        ctx.lineWidth = 4;
        if (typeof ctx.roundRect === "function") {
          ctx.beginPath();
          ctx.roundRect(6, 6, 244, 52, 26);
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
        ctx.fillText(fullText, 128, 33);
        const tex = new THREE.CanvasTexture(cvs);
        tex.needsUpdate = true;
        return tex;
      }
    } catch (_) {}
  }

  // Headless Node DataTexture fallback (RGBAFormat, 64x16)
  const w = 64;
  const h = 16;
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const isBorder = x < 2 || x >= w - 2 || y < 2 || y >= h - 2;
      data[i] = isBorder ? 94 : 14;
      data[i + 1] = isBorder ? 242 : 48;
      data[i + 2] = isBorder ? 200 : 44;
      data[i + 3] = 235;
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

export class OddrootCoopManager {
  constructor({
    scene,
    audio = null,
    toonGradientMap = null,
    sampleGroundY = null,
    onSharedCoinGrabbed = null,
  } = {}) {
    this.scene = scene;
    this.audio = audio;
    this.toonGradientMap = toonGradientMap;
    this.sampleGroundY = sampleGroundY || (() => 0.2);
    this.onSharedCoinGrabbed = onSharedCoinGrabbed || (() => {});

    this.rootGroup = new THREE.Group();
    this.rootGroup.name = "OddrootCoopRoot";
    if (this.scene) {
      this.scene.add(this.rootGroup);
    }

    this.partnersGroup = new THREE.Group();
    this.partnersGroup.name = "CoopRemotePartners";
    this.rootGroup.add(this.partnersGroup);

    this.coinsGroup = new THREE.Group();
    this.coinsGroup.name = "CoopSharedCoins";
    this.rootGroup.add(this.coinsGroup);

    this.fxGroup = new THREE.Group();
    this.fxGroup.name = "CoopCelebrationEffects";
    this.rootGroup.add(this.fxGroup);

    this.partners = new Map();
    this.coins = new Map();
    this.skyBeams = [];
    this.fireworks = [];

    this._buildSharedCoins();
    this._buildEffectPools();
  }

  _buildSharedCoins() {
    const grad = this.toonGradientMap || null;
    const goldMat = new THREE.MeshToonMaterial({
      color: 0xffd166,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.72,
      gradientMap: grad,
    });
    const starMat = new THREE.MeshToonMaterial({
      color: 0xfff3b0,
      emissive: 0xfbbf24,
      emissiveIntensity: 0.9,
      gradientMap: grad,
    });
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x62f5e4,
      transparent: true,
      opacity: 0.58,
      side: THREE.DoubleSide,
    });

    const discGeo = new THREE.CylinderGeometry(0.72, 0.72, 0.2, 20);
    const starGeo = new THREE.OctahedronGeometry(0.42, 0);
    const ringGeo = new THREE.RingGeometry(0.82, 1.04, 24);

    let idx = 0;
    for (const coinId of SHARED_COIN_IDS) {
      const pos = SHARED_COIN_POSITIONS[coinId];
      const gy = this.sampleGroundY(pos.x, pos.z);
      const group = new THREE.Group();
      group.name = `SharedStarCoin_${coinId}`;
      group.position.set(pos.x, gy + 1.15, pos.z);

      const spinner = new THREE.Group();
      const disc = new THREE.Mesh(discGeo, goldMat);
      disc.rotation.z = Math.PI / 2;
      spinner.add(disc);

      const star = new THREE.Mesh(starGeo, starMat);
      star.scale.set(0.55, 1.15, 1.15);
      spinner.add(star);
      group.add(spinner);

      const groundHalo = new THREE.Mesh(ringGeo, haloMat);
      groundHalo.rotation.x = -Math.PI / 2;
      groundHalo.position.y = -0.95;
      group.add(groundHalo);

      this.coinsGroup.add(group);
      this.coins.set(coinId, {
        coinId,
        index: idx,
        x: pos.x,
        y: gy + 1.15,
        z: pos.z,
        baseY: gy + 1.15,
        available: true,
        localGrabLatch: false,
        popScale: 1.0,
        group,
        spinner,
        groundHalo,
      });
      idx++;
    }
  }

  _buildEffectPools() {
    const beamGeo = new THREE.CylinderGeometry(0.65, 1.85, 36.0, 16, 1, true);
    const pulseGeo = new THREE.TorusGeometry(1.0, 0.14, 8, 32);
    const sparkGeo = new THREE.OctahedronGeometry(0.28, 0);

    for (let i = 0; i < 4; i++) {
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0x5ef2c8,
        transparent: true,
        opacity: 0.78,
        side: THREE.DoubleSide,
      });
      const pulseMat = new THREE.MeshBasicMaterial({
        color: 0xffd166,
        transparent: true,
        opacity: 0.85,
      });
      const grp = new THREE.Group();
      grp.visible = false;

      const column = new THREE.Mesh(beamGeo, beamMat);
      column.position.y = 18.0;
      grp.add(column);

      const pulseRing = new THREE.Mesh(pulseGeo, pulseMat);
      pulseRing.rotation.x = Math.PI / 2;
      pulseRing.position.y = 0.35;
      grp.add(pulseRing);

      const burstStars = [];
      for (let s = 0; s < 14; s++) {
        const sMat = new THREE.MeshBasicMaterial({
          color: s % 2 === 0 ? 0xffd166 : 0x5ef2c8,
          transparent: true,
          opacity: 0.92,
        });
        const star = new THREE.Mesh(sparkGeo, sMat);
        grp.add(star);
        burstStars.push(star);
      }

      this.fxGroup.add(grp);
      this.skyBeams.push({
        active: false,
        elapsed: 0,
        duration: 1.65,
        overdrive: false,
        group: grp,
        column,
        beamMat,
        pulseRing,
        pulseMat,
        burstStars,
      });
    }

    for (let i = 0; i < 8; i++) {
      const grp = new THREE.Group();
      grp.visible = false;
      const stars = [];
      for (let s = 0; s < 12; s++) {
        const mat = new THREE.MeshBasicMaterial({
          color: s % 3 === 0 ? 0xff9ec7 : s % 3 === 1 ? 0xffd166 : 0x62f5e4,
          transparent: true,
          opacity: 0.95,
        });
        const mesh = new THREE.Mesh(sparkGeo, mat);
        grp.add(mesh);
        stars.push({ mesh, mat, index: s });
      }
      this.fxGroup.add(grp);
      this.fireworks.push({
        active: false,
        kind: "flare",
        elapsed: 0,
        duration: 1.25,
        originX: 0,
        originY: 0,
        originZ: 0,
        group: grp,
        stars,
      });
    }
  }

  _normalizePartnerMount(rawId) {
    if (
      rawId === "bramble_boar" ||
      rawId === "boar" ||
      rawId === "terra_dozer"
    ) {
      return "bramble_boar";
    }
    return "starlight_glider";
  }

  _buildPartnerCharacterGroup(mountMode, upgrades = []) {
    const grad = this.toonGradientMap || null;
    const upgSet = new Set(Array.isArray(upgrades) ? upgrades : []);
    const group = new THREE.Group();

    const cloakMat = new THREE.MeshToonMaterial({
      color: mountMode === "bramble_boar" ? 0xd98a2b : 0x45d9c6,
      emissive: mountMode === "bramble_boar" ? 0x6b3f0d : 0x136f63,
      emissiveIntensity: 0.35,
      gradientMap: grad,
    });
    const trimMat = new THREE.MeshToonMaterial({
      color: 0xffd166,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.58,
      gradientMap: grad,
    });
    const wingMat = new THREE.MeshToonMaterial({
      color: 0x62f5e4,
      emissive: 0x2dd4bf,
      emissiveIntensity: 0.55,
      transparent: true,
      opacity: 0.88,
      gradientMap: grad,
    });

    if (mountMode === "bramble_boar") {
      const boarBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.62, 1.1, 6, 12), cloakMat);
      boarBody.rotation.x = Math.PI / 2;
      boarBody.position.y = 0.78;
      group.add(boarBody);

      const tuskSpan = upgSet.has("or_tusk_plow") || upgSet.has("wide_blade") ? 1.05 : 0.68;
      for (const sx of [-1, 1]) {
        const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.85, 8), trimMat);
        tusk.rotation.x = -Math.PI / 3;
        tusk.position.set(sx * tuskSpan, 0.72, -0.95);
        group.add(tusk);
      }

      const rider = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.55, 6, 10), wingMat);
      rider.position.set(0, 1.55, 0.08);
      group.add(rider);
    } else {
      const tunic = new THREE.Mesh(new THREE.ConeGeometry(0.54, 1.32, 10), cloakMat);
      tunic.position.y = 0.92;
      group.add(tunic);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), trimMat);
      head.position.y = 1.78;
      group.add(head);

      const wingSpan = upgSet.has("or_glide_wings") || upgSet.has("ion_boosters") ? 1.45 : 1.02;
      for (const sx of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(wingSpan, 0.08, 0.72), wingMat);
        wing.position.set(sx * (0.45 + wingSpan * 0.42), 1.28, 0.22);
        wing.rotation.z = sx * 0.22;
        group.add(wing);
      }
    }

    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.85, 8), trimMat);
    staff.position.set(0.55, 1.25, -0.25);
    group.add(staff);
    const crescent = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.05, 8, 18, Math.PI * 1.4), wingMat);
    crescent.position.set(0.55, 2.22, -0.25);
    group.add(crescent);

    return group;
  }

  _createPartnerEntry(peerId, peer) {
    const mountMode = this._normalizePartnerMount(
      peer.chassisOrMount || peer.chassisOrAvatar || peer.mountId
    );
    const rootGroup = new THREE.Group();
    rootGroup.name = `RemotePartner_${peerId}`;

    const modelGroup = this._buildPartnerCharacterGroup(mountMode, peer.upgrades);
    rootGroup.add(modelGroup);

    // Swirling Cyan Holo-Ring / Blueprint Halo when status === "thinking"
    const thinkingHaloGroup = new THREE.Group();
    thinkingHaloGroup.name = "ThinkingCyanHoloRing";
    thinkingHaloGroup.position.y = 2.45;
    thinkingHaloGroup.visible = false;

    const holoMat = new THREE.MeshBasicMaterial({
      color: 0x38f2ff,
      transparent: true,
      opacity: 0.88,
    });
    const outerHolo = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.06, 8, 32), holoMat);
    outerHolo.rotation.x = Math.PI / 2.3;
    thinkingHaloGroup.add(outerHolo);

    const innerHolo = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.045, 8, 24), holoMat);
    innerHolo.rotation.x = -Math.PI / 2.6;
    thinkingHaloGroup.add(innerHolo);

    for (let r = 0; r < 4; r++) {
      const ang = (r / 4) * Math.PI * 2;
      const rune = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), holoMat);
      rune.position.set(Math.cos(ang) * 1.18, 0, Math.sin(ang) * 1.18);
      thinkingHaloGroup.add(rune);
    }
    rootGroup.add(thinkingHaloGroup);

    // Radiant Golden Comet Aura & Trail when status === "surge" || "overdrive"
    const surgeAuraGroup = new THREE.Group();
    surgeAuraGroup.name = "SurgeGoldenCometAura";
    surgeAuraGroup.position.y = 1.05;
    surgeAuraGroup.visible = false;

    const cometMat = new THREE.MeshBasicMaterial({
      color: 0xffcf48,
      transparent: true,
      opacity: 0.86,
      side: THREE.DoubleSide,
    });
    const corona = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.1, 8, 28), cometMat);
    corona.rotation.x = Math.PI / 2;
    surgeAuraGroup.add(corona);

    const cometTail = new THREE.Mesh(new THREE.ConeGeometry(0.68, 2.8, 12, 1, true), cometMat);
    cometTail.rotation.x = Math.PI / 2;
    cometTail.position.set(0, 0.15, 1.75);
    surgeAuraGroup.add(cometTail);
    rootGroup.add(surgeAuraGroup);

    // Floating 3D Sprite Name/Avatar Badge
    const labelKey = `${peer.avatar || "🦊"}|${peer.displayName || peerId}`;
    const badgeTex = createPartnerBadgeTexture(peer.displayName || peerId, peer.avatar || "🦊");
    const badgeMat = new THREE.SpriteMaterial({
      map: badgeTex,
      transparent: true,
      depthTest: false,
    });
    const badgeSprite = new THREE.Sprite(badgeMat);
    badgeSprite.name = "PartnerNameBadge";
    badgeSprite.position.set(0, 3.45, 0);
    badgeSprite.scale.set(3.4, 0.85, 1.0);
    rootGroup.add(badgeSprite);

    const x0 = clampPartnerCoord(peer.x, 0);
    const z0 = clampPartnerCoord(peer.z, 18);
    const y0 = Number.isFinite(Number(peer.y))
      ? clampPartnerCoord(peer.y, 0.65)
      : this.sampleGroundY(x0, z0) + 0.45;
    const h0 = normalizeAngleRad(peer.heading, 0);

    rootGroup.position.set(x0, y0, z0);
    rootGroup.rotation.y = h0;
    this.partnersGroup.add(rootGroup);

    return {
      userId: peerId,
      displayName: peer.displayName || peerId,
      avatar: peer.avatar || "🦊",
      labelKey,
      mountMode,
      upgradesKey: JSON.stringify(peer.upgrades || []),
      status: peer.status || "roaming",
      currentX: x0,
      currentY: y0,
      currentZ: z0,
      currentHeading: h0,
      targetX: x0,
      targetY: y0,
      targetZ: z0,
      targetHeading: h0,
      speed: Number.isFinite(Number(peer.speed)) ? Number(peer.speed) : 0,
      rootGroup,
      modelGroup,
      thinkingHaloGroup,
      surgeAuraGroup,
      badgeSprite,
    };
  }

  syncRemotePartners(peersArray = []) {
    const list = Array.isArray(peersArray) ? peersArray : [];
    const seenIds = new Set();

    for (let i = 0; i < list.length; i++) {
      const peer = list[i];
      if (!peer) continue;
      const peerId = String(peer.userId || peer.id || peer.displayName || `peer_${i}`);
      seenIds.add(peerId);

      let entry = this.partners.get(peerId);
      if (!entry) {
        entry = this._createPartnerEntry(peerId, peer);
        this.partners.set(peerId, entry);
      } else {
        const nextMount = this._normalizePartnerMount(
          peer.chassisOrMount || peer.chassisOrAvatar || peer.mountId || entry.mountMode
        );
        const nextUpgKey = JSON.stringify(peer.upgrades || []);
        if (nextMount !== entry.mountMode || nextUpgKey !== entry.upgradesKey) {
          entry.rootGroup.remove(entry.modelGroup);
          this._disposePartnerSubtree(entry.modelGroup);
          entry.modelGroup = this._buildPartnerCharacterGroup(nextMount, peer.upgrades);
          entry.rootGroup.add(entry.modelGroup);
          entry.mountMode = nextMount;
          entry.upgradesKey = nextUpgKey;
        }

        const nextLabelKey = `${peer.avatar || "🦊"}|${peer.displayName || peerId}`;
        if (nextLabelKey !== entry.labelKey) {
          if (entry.badgeSprite.material.map) {
            entry.badgeSprite.material.map.dispose();
          }
          entry.badgeSprite.material.map = createPartnerBadgeTexture(
            peer.displayName || peerId,
            peer.avatar || "🦊"
          );
          entry.badgeSprite.material.needsUpdate = true;
          entry.labelKey = nextLabelKey;
          entry.displayName = peer.displayName || peerId;
          entry.avatar = peer.avatar || "🦊";
        }

        if (Number.isFinite(Number(peer.x))) entry.targetX = clampPartnerCoord(peer.x, entry.targetX);
        if (Number.isFinite(Number(peer.z))) entry.targetZ = clampPartnerCoord(peer.z, entry.targetZ);
        entry.targetY = Number.isFinite(Number(peer.y))
          ? clampPartnerCoord(peer.y, entry.targetY)
          : this.sampleGroundY(entry.targetX, entry.targetZ) + 0.45;
        if (Number.isFinite(Number(peer.heading))) {
          entry.targetHeading = normalizeAngleRad(peer.heading, entry.targetHeading);
        }
        entry.speed = Number.isFinite(Number(peer.speed)) ? Number(peer.speed) : 0;
      }

      const status = String(peer.status || "roaming");
      entry.status = status;
      entry.thinkingHaloGroup.visible = status === "thinking";
      entry.surgeAuraGroup.visible =
        status === "surge" || status === "overdrive" || Boolean(peer.streakActive);
    }

    for (const [peerId, entry] of this.partners.entries()) {
      if (!seenIds.has(peerId)) {
        this.partnersGroup.remove(entry.rootGroup);
        this._disposePartnerSubtree(entry.rootGroup);
        this.partners.delete(peerId);
      }
    }
  }

  _disposePartnerSubtree(root) {
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
            if (m && m.map && typeof m.map.dispose === "function") m.map.dispose();
            if (m && typeof m.dispose === "function") m.dispose();
          }
        }
      } catch (_) {}
    });
  }

  syncSharedCoins(coinStatesMap = {}) {
    if (!coinStatesMap) return;
    for (const coinId of SHARED_COIN_IDS) {
      const coin = this.coins.get(coinId);
      if (!coin) continue;
      let st = null;
      if (coinStatesMap instanceof Map) {
        st = coinStatesMap.get(coinId);
      } else if (Array.isArray(coinStatesMap)) {
        st = coinStatesMap.find((c) => c && c.coinId === coinId);
      } else if (typeof coinStatesMap === "object") {
        st = coinStatesMap[coinId];
      }
      if (!st) continue;

      const isAvailable = st.available !== false;
      const wasUnavailable = !coin.available;
      coin.available = isAvailable;
      coin.group.visible = isAvailable;
      if (isAvailable) {
        coin.localGrabLatch = false;
        if (wasUnavailable) {
          coin.popScale = 0.35;
          coin.group.scale.setScalar(0.35);
        }
      }
    }
  }

  _spawnFireworkAt(kind, x, y, z) {
    let slot = this.fireworks.find((f) => !f.active);
    if (!slot) slot = this.fireworks[0];

    slot.active = true;
    slot.kind = kind;
    slot.elapsed = 0;
    slot.duration = kind === "coin_shower" ? 0.65 : 1.3;
    slot.originX = x;
    slot.originY = y;
    slot.originZ = z;
    slot.group.position.set(x, y, z);
    slot.group.visible = true;

    for (const star of slot.stars) {
      if (kind === "coin_shower") {
        star.mat.color.setHex(star.index % 2 === 0 ? 0xffd166 : 0xfff3b0);
      } else {
        star.mat.color.setHex(
          star.index % 3 === 0 ? 0xff9ec7 : star.index % 3 === 1 ? 0xffd166 : 0x62f5e4
        );
      }
      star.mat.opacity = 0.95;
      star.mesh.position.set(0, 0, 0);
      star.mesh.scale.setScalar(1.0);
    }
    return slot;
  }

  playPartnerCoopEvent(event = {}) {
    if (!event || !event.type) return null;

    let ex = Number(event.x);
    let ey = Number(event.y);
    let ez = Number(event.z);
    if (!Number.isFinite(ex) || !Number.isFinite(ez)) {
      const partner = event.byUser ? this.partners.get(String(event.byUser)) : null;
      const fallbackPartner = partner || this.partners.values().next().value || null;
      ex = fallbackPartner ? fallbackPartner.currentX : 0;
      ez = fallbackPartner ? fallbackPartner.currentZ : -8;
    }
    if (!Number.isFinite(ey)) {
      ey = this.sampleGroundY(ex, ez) + 0.5;
    }

    if (event.type === "gate_burst") {
      // Towering 3D Aurora Sky-Beam + Crystal Firework + Co-Op Resonance Pulse
      // STRICT RESOURCE FAIRNESS: 100% non-stealable — touches ZERO local shrines or shards!
      let beam = this.skyBeams.find((b) => !b.active);
      if (!beam) beam = this.skyBeams[0];

      beam.active = true;
      beam.elapsed = 0;
      beam.duration = 1.65;
      beam.overdrive = Boolean(event.overdrive);
      beam.group.position.set(ex, ey, ez);
      beam.beamMat.color.setHex(beam.overdrive ? 0xffd166 : 0x5ef2c8);
      beam.beamMat.opacity = 0.82;
      beam.pulseMat.opacity = 0.9;
      beam.pulseRing.scale.setScalar(1.2);
      beam.group.visible = true;

      for (let i = 0; i < beam.burstStars.length; i++) {
        beam.burstStars[i].position.set(0, 9.0, 0);
      }

      this.audio?.playCoopGateBurst?.(beam.overdrive);
      return beam;
    }

    if (event.type === "friendly_flare") {
      const fw = this._spawnFireworkAt("flare", ex, ey + 2.6, ez);
      this.audio?.playCoopFlare?.();
      return fw;
    }

    if (event.type === "coin_grab") {
      const coinId = event.coinId || "coin_0";
      const coin = this.coins.get(coinId);
      const cx = coin ? coin.x : ex;
      const cy = coin ? coin.y : ey + 1.0;
      const cz = coin ? coin.z : ez;
      if (coin) {
        coin.available = false;
        coin.group.visible = false;
      }
      const shower = this._spawnFireworkAt("coin_shower", cx, cy, cz);
      this.audio?.playCoinGrab?.();
      return shower;
    }

    return null;
  }

  playLocalFlare(localPos = { x: 0, y: 1, z: 22 }) {
    const lx = Number.isFinite(Number(localPos?.x)) ? clampPartnerCoord(localPos.x, 0) : 0;
    const lz = Number.isFinite(Number(localPos?.z)) ? clampPartnerCoord(localPos.z, 22) : 22;
    const ly = Number.isFinite(Number(localPos?.y))
      ? clampPartnerCoord(localPos.y, 1)
      : this.sampleGroundY(lx, lz) + 0.55;
    const fw = this._spawnFireworkAt("flare", lx, ly + 2.8, lz);
    this.audio?.playCoopFlare?.();
    return fw;
  }

  step(rawDt, rawElapsed = 0, localPlayerPos = null) {
    const dt = Number.isFinite(Number(rawDt)) && Number(rawDt) >= 0 ? Math.min(0.1, Number(rawDt)) : 0;
    const elapsed = Number.isFinite(Number(rawElapsed)) ? Number(rawElapsed) : 0;
    // 1. Smooth 60fps lerp on remote partners + animated status auras
    const lerpAlpha = 1 - Math.exp(-12.0 * dt);
    for (const partner of this.partners.values()) {
      partner.currentX += (partner.targetX - partner.currentX) * lerpAlpha;
      partner.currentY += (partner.targetY - partner.currentY) * lerpAlpha;
      partner.currentZ += (partner.targetZ - partner.currentZ) * lerpAlpha;
      partner.currentHeading +=
        wrapAngleDelta(partner.currentHeading, partner.targetHeading) * lerpAlpha;

      partner.rootGroup.position.set(partner.currentX, partner.currentY, partner.currentZ);
      partner.rootGroup.rotation.y = partner.currentHeading;

      if (partner.thinkingHaloGroup.visible) {
        partner.thinkingHaloGroup.rotation.y += dt * 2.2;
        partner.thinkingHaloGroup.position.y = 2.45 + Math.sin(elapsed * 3.0) * 0.1;
      }
      if (partner.surgeAuraGroup.visible) {
        partner.surgeAuraGroup.children[0].rotation.z += dt * 3.4;
      }
    }

    // 2. Shared Bouncing 3D Star-Coins + <= 2.8m local pickup detection
    const px = Number.isFinite(Number(localPlayerPos?.x)) ? Number(localPlayerPos.x) : null;
    const pz = Number.isFinite(Number(localPlayerPos?.z)) ? Number(localPlayerPos.z) : null;

    for (const coin of this.coins.values()) {
      if (!coin.available) continue;

      if (coin.popScale < 1.0) {
        coin.popScale = Math.min(1.0, coin.popScale + dt * 4.2);
        coin.group.scale.setScalar(coin.popScale);
      }

      coin.spinner.rotation.y += dt * 2.6;
      coin.y = coin.baseY + Math.sin(elapsed * 3.4 + coin.index * 1.1) * 0.22;
      coin.group.position.y = coin.y;

      if (px !== null && pz !== null && !coin.localGrabLatch) {
        const dist = Math.hypot(px - coin.x, pz - coin.z);
        if (dist <= COIN_PICKUP_RADIUS) {
          coin.localGrabLatch = true;
          coin.available = false;
          coin.group.visible = false;
          this._spawnFireworkAt("coin_shower", coin.x, coin.y, coin.z);
          this.audio?.playCoinGrab?.();
          this.onSharedCoinGrabbed(coin.coinId);
        }
      }
    }

    // 3. Step Aurora Sky-Beams + Co-Op Resonance Pulses
    for (const beam of this.skyBeams) {
      if (!beam.active) continue;
      beam.elapsed += dt;
      const u = Math.min(1, beam.elapsed / beam.duration);
      beam.beamMat.opacity = Math.max(0, 0.82 * (1 - u));
      beam.pulseMat.opacity = Math.max(0, 0.9 * (1 - u));
      beam.pulseRing.scale.setScalar(1.2 + u * 16.8);

      for (let i = 0; i < beam.burstStars.length; i++) {
        const ang = (i / beam.burstStars.length) * Math.PI * 2;
        const r = u * 6.5;
        const sy = 9.0 + Math.sin(u * Math.PI) * 5.2 + (i % 3) * 0.8;
        beam.burstStars[i].position.set(Math.cos(ang) * r, sy, Math.sin(ang) * r);
        beam.burstStars[i].scale.setScalar(Math.max(0.15, 1.2 * (1 - u)));
      }

      if (u >= 1) {
        beam.active = false;
        beam.group.visible = false;
      }
    }

    // 4. Step Starlight Heart/Star Fireworks & Golden Coin Showers
    for (const fw of this.fireworks) {
      if (!fw.active) continue;
      fw.elapsed += dt;
      const u = Math.min(1, fw.elapsed / fw.duration);
      for (const star of fw.stars) {
        const t = (star.index / fw.stars.length) * Math.PI * 2;
        if (fw.kind === "coin_shower") {
          const r = u * 2.8;
          const lift = Math.sin(u * Math.PI) * 2.4;
          star.mesh.position.set(Math.cos(t) * r, lift, Math.sin(t) * r);
        } else {
          // Parametric 3D heart-star burst in local (X, Y)
          const hx = 16 * Math.pow(Math.sin(t), 3) * 0.14 * u;
          const hy =
            (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) *
            0.14 *
            u;
          star.mesh.position.set(hx, 1.4 + hy, Math.sin(t * 2) * 0.65 * u);
        }
        star.mat.opacity = Math.max(0, 0.95 * (1 - u));
        star.mesh.scale.setScalar(Math.max(0.2, 1.15 * (1 - u * 0.6)));
      }
      if (u >= 1) {
        fw.active = false;
        fw.group.visible = false;
      }
    }
  }
}
