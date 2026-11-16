/**
 * Arc Bastion: Siegesmiths — Self-vs-Self 3D Ghost-Rover Controller
 * Records (x, z, heading) keyframes during active Siege Battery raids,
 * pauses completely during Encounter Dock / Gate thinking, replays a translucent
 * cyan-and-gold hologram Siege-Rover for bestRaidSec, and celebrates personal records
 * with zero negative time deltas.
 */

import * as THREE from "../vendor/three.module.min.js";

const SAMPLE_INTERVAL_SEC = 0.25;
const MAX_GHOST_FRAMES = 180;
const MAX_GHOST_COORD = 120;
const MAX_GHOST_TIME_SEC = 3600;

function finiteOr(n, fallback = 0) {
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
}

function clampCoord(n, fallback = 0) {
  const v = finiteOr(n, NaN);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(-MAX_GHOST_COORD, Math.min(MAX_GHOST_COORD, v));
}

function normalizeAngle(rad, fallback = 0) {
  const safe = finiteOr(rad, fallback);
  return Math.atan2(Math.sin(safe), Math.cos(safe));
}

function round2(n) {
  return Math.round(finiteOr(n, 0) * 100) / 100;
}

function round3(n) {
  return Math.round(finiteOr(n, 0) * 1000) / 1000;
}

function lerpShortestAngle(a, b, alpha) {
  const baseA = normalizeAngle(a, 0);
  const baseB = normalizeAngle(b, 0);
  const diff = Math.atan2(Math.sin(baseB - baseA), Math.cos(baseB - baseA));
  const t = Math.max(0, Math.min(1, finiteOr(alpha, 0)));
  return baseA + diff * t;
}

export class GhostRoverController {
  constructor(scene, baseHeightFn) {
    this.scene = scene && typeof scene.add === "function" ? scene : null;
    this.baseHeightFn = typeof baseHeightFn === "function" ? baseHeightFn : () => 0;
    this.bestRaidSec = null;
    this.bestWaveSec = null;
    this.bestFrames = [];
    this.recordingFrames = [];
    this.waveElapsedSec = 0;
    this.sampleAccumSec = 0;
    this.effectiveSampleInterval = SAMPLE_INTERVAL_SEC;
    this.waveActive = false;
    this.lastBannerText = null;
    this.rigId = "iron_ballista";
    this.mesh = this._buildGhostMesh("iron_ballista");
    if (this.scene) this.scene.add(this.mesh);
  }

  _buildGhostMesh(rigId = "iron_ballista") {
    const g = new THREE.Group();
    g.name = "self_ghost_rover";
    g.visible = false;

    const holoMat = new THREE.MeshStandardMaterial({
      color: 0x7ee8fa,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.9,
      transparent: true,
      opacity: 0.42,
      roughness: 0.16,
      depthWrite: false,
    });
    const goldTrimMat = new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.64,
      depthWrite: false,
    });

    if (rigId === "prism_rail_skiff" || rigId === "rail_skiff") {
      const hull = new THREE.Mesh(new THREE.ConeGeometry(1.2, 4.2, 6), holoMat);
      hull.rotation.x = -Math.PI / 2;
      hull.position.set(0, 0.98, 0);
      const fins = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.14, 1.3), goldTrimMat);
      fins.position.set(0, 0.85, 0.3);
      g.add(hull, fins);
    } else {
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.96, 3.4), holoMat);
      body.position.set(0, 0.98, 0.15);
      const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.8, 0.64, 10), goldTrimMat);
      turret.position.set(0, 1.72, 0.15);
      const gearRam = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.12, 8, 12), goldTrimMat);
      gearRam.position.set(0, 0.72, -1.85);
      g.add(body, turret, gearRam);
    }

    const ringGeo = new THREE.RingGeometry(1.75, 2.08, 28);
    ringGeo.rotateX(-Math.PI / 2);
    const ring = new THREE.Mesh(ringGeo, goldTrimMat);
    ring.position.set(0, 0.12, 0);
    g.add(ring);

    return g;
  }

  setRigAppearance(rigId = "iron_ballista") {
    const nextId =
      rigId === "prism_rail_skiff" || rigId === "rail_skiff"
        ? "prism_rail_skiff"
        : "iron_ballista";
    if (nextId === this.rigId && this.mesh) return;
    const wasVisible = this.mesh ? this.mesh.visible : false;
    const prevPos = this.mesh ? this.mesh.position.clone() : new THREE.Vector3();
    const prevRotY = this.mesh ? this.mesh.rotation.y : 0;
    if (this.mesh && this.scene) {
      this.scene.remove(this.mesh);
    }
    this.rigId = nextId;
    this.mesh = this._buildGhostMesh(nextId);
    this.mesh.position.copy(prevPos);
    this.mesh.rotation.y = prevRotY;
    this.mesh.visible = wasVisible;
    if (this.scene) this.scene.add(this.mesh);
  }

  setChassisAppearance(rigId = "iron_ballista") {
    this.setRigAppearance(rigId);
  }

  loadFromProgress(progress) {
    if (!progress || typeof progress !== "object") return;
    const rawAb = progress.games?.arc_bastion ?? progress.realms?.arc_bastion;
    const ab = rawAb && typeof rawAb === "object" ? rawAb : {};
    const savedObj = ab.ghostBest && typeof ab.ghostBest === "object" ? ab.ghostBest : ab;
    const savedSec = finiteOr(
      savedObj.bestRaidSec ?? savedObj.bestWaveSec ?? ab.bestRaidSec,
      NaN
    );
    const rawFrames = Array.isArray(savedObj.frames)
      ? savedObj.frames
      : Array.isArray(ab.ghostFrames)
      ? ab.ghostFrames
      : [];
    const validFrames = rawFrames
      .filter((f) => f && typeof f === "object")
      .slice(0, MAX_GHOST_FRAMES * 2);

    if (Number.isFinite(savedSec) && savedSec > 0 && validFrames.length >= 2) {
      const clampedSec = round2(Math.max(0.5, Math.min(MAX_GHOST_TIME_SEC, savedSec)));
      this.bestRaidSec = clampedSec;
      this.bestWaveSec = clampedSec;
      this.bestFrames = validFrames.map((f) => ({
        t: round2(Math.max(0, Math.min(MAX_GHOST_TIME_SEC, finiteOr(f.t, 0)))),
        x: round2(clampCoord(f.x, 0)),
        z: round2(clampCoord(f.z, 0)),
        heading: round3(normalizeAngle(f.heading, 0)),
      }));
    }
  }

  startWave(initialRigState = { x: 0, z: 14, heading: 0 }) {
    const safeRig =
      initialRigState && typeof initialRigState === "object"
        ? initialRigState
        : { x: 0, z: 14, heading: 0 };
    this.waveElapsedSec = 0;
    this.sampleAccumSec = 0;
    this.effectiveSampleInterval = SAMPLE_INTERVAL_SEC;
    this.waveActive = true;
    this.lastBannerText = null;
    this.recordingFrames = [
      {
        t: 0,
        x: round2(clampCoord(safeRig.x, 0)),
        z: round2(clampCoord(safeRig.z, 14)),
        heading: round3(normalizeAngle(safeRig.heading, 0)),
      },
    ];

    if (this.bestFrames.length >= 2 && this.bestRaidSec !== null) {
      const f0 = this.bestFrames[0];
      const y0 = finiteOr(this.baseHeightFn(f0.x, f0.z), 0) + 0.22;
      this.mesh.position.set(f0.x, y0, f0.z);
      this.mesh.rotation.y = normalizeAngle(f0.heading, 0);
      this.mesh.visible = true;
    } else {
      this.mesh.visible = false;
    }
  }

  update(dt, rigState, isPaused = false) {
    if (
      !this.waveActive ||
      isPaused ||
      !Number.isFinite(dt) ||
      !(dt > 0) ||
      !rigState ||
      typeof rigState !== "object"
    ) {
      return 0;
    }

    this.waveElapsedSec += dt;
    this.sampleAccumSec += dt;

    if (this.sampleAccumSec >= this.effectiveSampleInterval) {
      this.sampleAccumSec = 0;
      this.recordingFrames.push({
        t: round2(this.waveElapsedSec),
        x: round2(clampCoord(rigState.x, 0)),
        z: round2(clampCoord(rigState.z, 0)),
        heading: round3(normalizeAngle(rigState.heading, 0)),
      });

      if (this.recordingFrames.length > MAX_GHOST_FRAMES) {
        const decimated = [this.recordingFrames[0]];
        for (let i = 1; i < this.recordingFrames.length - 1; i += 2) {
          decimated.push(this.recordingFrames[i]);
        }
        decimated.push(this.recordingFrames[this.recordingFrames.length - 1]);
        this.recordingFrames = decimated;
        this.effectiveSampleInterval *= 2;
      }
    }

    if (this.bestFrames.length >= 2 && this.bestRaidSec !== null) {
      if (this.waveElapsedSec <= this.bestRaidSec) {
        const t = this.waveElapsedSec;
        let idx = 0;
        while (idx < this.bestFrames.length - 2 && this.bestFrames[idx + 1].t < t) {
          idx += 1;
        }
        const fA = this.bestFrames[idx];
        const fB = this.bestFrames[idx + 1];
        const span = Math.max(0.0001, fB.t - fA.t);
        const alpha = Math.max(0, Math.min(1, (t - fA.t) / span));
        const gx = clampCoord(fA.x + (fB.x - fA.x) * alpha, 0);
        const gz = clampCoord(fA.z + (fB.z - fA.z) * alpha, 0);
        const gh = lerpShortestAngle(fA.heading, fB.heading, alpha);
        const gy = finiteOr(this.baseHeightFn(gx, gz), 0) + 0.22;
        this.mesh.position.set(gx, gy, gz);
        this.mesh.rotation.y = gh;
        this.mesh.visible = true;
      } else {
        this.mesh.visible = false;
      }
    }

    return dt;
  }

  _persistToProgress(progressRef) {
    if (!progressRef || typeof progressRef !== "object" || Object.isFrozen(progressRef)) return;
    try {
      if (!progressRef.games || typeof progressRef.games !== "object") {
        progressRef.games = {};
      }
      if (!progressRef.games.arc_bastion || typeof progressRef.games.arc_bastion !== "object") {
        progressRef.games.arc_bastion = {};
      }
      const ab = progressRef.games.arc_bastion;
      ab.bestRaidSec = this.bestRaidSec;
      ab.ghostFrames = this.bestFrames.map((f) => ({ ...f }));
      ab.ghostBest = {
        bestRaidSec: this.bestRaidSec,
        bestWaveSec: this.bestRaidSec,
        frames: this.bestFrames.map((f) => ({ ...f })),
      };
    } catch (_) {}
  }

  completeWave(progressRef = null, rigState = null) {
    if (!this.waveActive) {
      return {
        isNewRecord: false,
        raidSec: 0,
        bestRaidSec: this.bestRaidSec,
        bannerText: null,
      };
    }
    this.waveActive = false;
    this.mesh.visible = false;

    const finalSec = round2(Math.max(0.5, this.waveElapsedSec));
    if (rigState && typeof rigState === "object") {
      this.recordingFrames.push({
        t: finalSec,
        x: round2(clampCoord(rigState.x, 0)),
        z: round2(clampCoord(rigState.z, 0)),
        heading: round3(normalizeAngle(rigState.heading, 0)),
      });
    }

    const isNewRecord = this.bestRaidSec === null || finalSec < this.bestRaidSec;
    if (isNewRecord && this.recordingFrames.length >= 2) {
      this.bestRaidSec = finalSec;
      this.bestWaveSec = finalSec;
      this.bestFrames = this.recordingFrames.map((f) => ({ ...f }));
      this._persistToProgress(progressRef);
      // Zero negative time deltas, zero competitive rank markers!
      this.lastBannerText = `NEW SIEGE RAID PERSONAL BEST · ${finalSec}s! 🏆`;
    } else {
      this.lastBannerText = null;
    }

    return {
      isNewRecord,
      raidSec: finalSec,
      bestRaidSec: this.bestRaidSec,
      bannerText: this.lastBannerText,
    };
  }
}
